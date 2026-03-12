import Foundation
import SwiftUI
import UIKit

enum AppEnvironment: String {
    case production
    case staging
    case local
}

struct AppConfig {
    let environment: AppEnvironment
    let apiBaseURL: URL
    let usesBundledCommunityFixtures: Bool
    let screenshotRoute: URL?

    init(bundle: Bundle = .main) {
        let environmentRaw = bundle.object(forInfoDictionaryKey: "APIEnvironment") as? String ?? AppEnvironment.production.rawValue
        environment = AppEnvironment(rawValue: environmentRaw) ?? .production
        let processEnvironment = ProcessInfo.processInfo.environment
        usesBundledCommunityFixtures =
            processEnvironment["USE_BUNDLED_COMMUNITY_FIXTURES"] == "1" ||
            processEnvironment["APP_STORE_SCREENSHOT_MODE"] == "1"
        screenshotRoute = processEnvironment["SCREENSHOT_ROUTE"].flatMap(URL.init(string:))

        if let urlString = bundle.object(forInfoDictionaryKey: "APIBaseURL") as? String,
           let url = URL(string: urlString) {
            apiBaseURL = url
        } else {
            apiBaseURL = URL(string: "https://yosoymx.com/api")!
        }
    }
}

enum BundleResourceLocator {
    static func resourceURL(for resourcePath: String) -> URL? {
        let trimmed = resourcePath.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let fileName = (trimmed as NSString).lastPathComponent
        let fileBase = (fileName as NSString).deletingPathExtension
        let fileExtension = (fileName as NSString).pathExtension
        let subdirectory = (trimmed as NSString).deletingLastPathComponent

        if !subdirectory.isEmpty,
           let direct = Bundle.main.url(forResource: fileBase, withExtension: fileExtension, subdirectory: subdirectory) {
            return direct
        }

        if let direct = Bundle.main.url(forResource: fileBase, withExtension: fileExtension) {
            return direct
        }

        let candidateDirectories = [nil, "photos", "pdfs", subdirectory.isEmpty ? nil : subdirectory]
        for directory in candidateDirectories {
            if let urls = Bundle.main.urls(forResourcesWithExtension: fileExtension, subdirectory: directory) {
                if let match = urls.first(where: { $0.lastPathComponent == fileName }) {
                    return match
                }
            }
        }

        return nil
    }

    static func image(for resourcePath: String) -> UIImage? {
        guard let url = resourceURL(for: resourcePath) else { return nil }
        return UIImage(contentsOfFile: url.path)
    }
}

@MainActor
final class AppModel: ObservableObject {
    @Published private(set) var edition: EditionPayload
    @Published private(set) var content: IssueContent
    @Published private(set) var brandConfig: BrandConfig
    let theme: AppTheme
    let config: AppConfig
    let apiClient: APIClient

    init(bundle: Bundle = .main) {
        let decoder = JSONDecoder()
        config = AppConfig(bundle: bundle)
        let fallbackContent = AppModel.load("issue-content", bundle: bundle, decoder: decoder) as IssueContent
        let fallbackBrand = AppModel.load("brand-config", bundle: bundle, decoder: decoder) as BrandConfig
        edition = EditionPayload(
            id: fallbackContent.id,
            slug: fallbackContent.id,
            status: "published",
            version: Int(fallbackContent.metadata.version.split(separator: ".").first ?? "1") ?? 1,
            publishedAt: fallbackContent.metadata.publishedDateISO,
            label: fallbackContent.metadata.editionLabel,
            location: fallbackContent.metadata.location,
            themeLine: fallbackContent.metadata.coverThemeLine,
            socialAssetId: nil,
            contentPayload: fallbackContent,
            createdAt: fallbackContent.metadata.publishedDateISO,
            updatedAt: fallbackContent.metadata.publishedDateISO
        )
        content = fallbackContent
        brandConfig = fallbackBrand
        let tokens = AppModel.load("tokens", bundle: bundle, decoder: decoder) as DesignTokens
        theme = AppTheme.from(tokens)
        apiClient = APIClient(
            baseURL: config.apiBaseURL,
            bundledCommunityFixtures: BundledCommunityFixtures.load(bundle: bundle),
            useBundledCommunityFixtures: config.usesBundledCommunityFixtures
        )
        Task { await refreshPublishedEdition() }
    }

    private static func load<T: Decodable>(_ name: String, bundle: Bundle, decoder: JSONDecoder) -> T {
        guard let url = bundle.url(forResource: name, withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? decoder.decode(T.self, from: data) else {
            fatalError("No fue posible cargar \(name).json desde el bundle.")
        }
        return decoded
    }

    func refreshPublishedEdition() async {
        do {
            let remote = try await apiClient.fetchCurrentEdition()
            if let remoteEdition = remote.item {
                edition = remoteEdition
                content = remoteEdition.contentPayload
            }
            if let remoteBrand = remote.brand {
                brandConfig = remoteBrand
            }
        } catch {
            // Mantener fallback o caché local si la red falla.
        }
    }

    func loadEdition(slug: String) async {
        let normalized = slug.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalized.isEmpty else {
            await refreshPublishedEdition()
            return
        }

        do {
            let remote = try await apiClient.fetchEdition(slug: normalized)
            if let remoteEdition = remote.item {
                edition = remoteEdition
                content = remoteEdition.contentPayload
            } else {
                await refreshPublishedEdition()
            }
            if let remoteBrand = remote.brand {
                brandConfig = remoteBrand
            }
        } catch {
            await refreshPublishedEdition()
        }
    }
}

struct BundledCommunityFixtures: Decodable {
    let comments: [CommunityPost]
    let histories: [CommunityPost]

    static func load(bundle: Bundle) -> BundledCommunityFixtures? {
        guard let url = bundle.url(forResource: "community-fixtures", withExtension: "json"),
              let data = try? Data(contentsOf: url) else {
            return nil
        }
        return try? JSONDecoder().decode(BundledCommunityFixtures.self, from: data)
    }
}

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse(status: Int?)
    case invalidContentType(status: Int?)
    case server(status: Int, message: String)
    case transport(URLError)
    case userFacing(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "URL inválida."
        case .invalidResponse:
            return "Respuesta inválida del servidor."
        case .invalidContentType:
            return "El servidor respondió con un formato no válido."
        case .server(_, let message):
            return message
        case .transport:
            return "No fue posible conectar con el servicio."
        case .userFacing(let message):
            return message
        }
    }
}

private enum APIRequestContext {
    case publishedEdition
    case communityRead
    case communitySubmit
    case admin
}

final class APIClient: @unchecked Sendable {
    private let baseURL: URL
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    private let bundledCommunityFixtures: BundledCommunityFixtures?
    private let useBundledCommunityFixtures: Bool

    init(
        baseURL: URL,
        session: URLSession = .shared,
        bundledCommunityFixtures: BundledCommunityFixtures? = nil,
        useBundledCommunityFixtures: Bool = false
    ) {
        self.baseURL = baseURL
        self.session = session
        self.bundledCommunityFixtures = bundledCommunityFixtures
        self.useBundledCommunityFixtures = useBundledCommunityFixtures
        decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
    }

    func fetchCurrentEdition() async throws -> EditionEnvelope {
        try await request(path: "issues/current", context: .publishedEdition, response: EditionEnvelope.self)
    }

    func fetchEdition(slug: String) async throws -> EditionEnvelope {
        let encodedSlug = slug.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? slug
        return try await request(path: "issues/\(encodedSlug)", context: .publishedEdition, response: EditionEnvelope.self)
    }

    func fetchCommunity(kind: CommunityKind, limit: Int = 20) async throws -> [CommunityPost] {
        if useBundledCommunityFixtures, let bundledCommunityFixtures {
            let items = kind == .comment ? bundledCommunityFixtures.comments : bundledCommunityFixtures.histories
            return Array(items.prefix(limit))
        }

        return try await request(
            path: "community",
            query: [
                URLQueryItem(name: "kind", value: kind.rawValue),
                URLQueryItem(name: "limit", value: String(limit))
            ],
            context: .communityRead,
            response: ItemsEnvelope<CommunityPost>.self
        ).items.filter(\.approved)
    }

    func submitCommunity(_ input: CommunityPostInput) async throws -> CommunityPost {
        try await request(
            path: "community",
            method: "POST",
            context: .communitySubmit,
            body: input,
            response: ItemEnvelope<CommunityPost>.self
        ).item
    }

    func fetchAdminEditions(token: String, limit: Int = 40) async throws -> [AdminEdition] {
        try await request(
            path: "admin/editions",
            query: [URLQueryItem(name: "limit", value: String(limit))],
            token: token,
            context: .admin,
            response: ItemsEnvelope<AdminEdition>.self
        ).items
    }

    func createEdition(token: String, input: CreateEditionInput) async throws -> AdminEdition {
        try await request(
            path: "admin/editions",
            method: "POST",
            token: token,
            context: .admin,
            body: input,
            response: ItemEnvelope<AdminEdition>.self
        ).item
    }

    func fetchAdminCommunity(token: String, status: CommunityModerationStatus, limit: Int = 60) async throws -> [AdminCommunityItem] {
        try await request(
            path: "admin/community",
            query: [
                URLQueryItem(name: "status", value: status.rawValue),
                URLQueryItem(name: "limit", value: String(limit))
            ],
            token: token,
            context: .admin,
            response: ItemsEnvelope<AdminCommunityItem>.self
        ).items
    }

    func moderateCommunity(token: String, id: String, action: CommunityModerationAction) async throws -> AdminCommunityItem {
        struct ModerateBody: Encodable { let action: CommunityModerationAction }
        return try await request(
            path: "admin/community/\(id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? id)/moderate",
            method: "POST",
            token: token,
            context: .admin,
            body: ModerateBody(action: action),
            response: ItemEnvelope<AdminCommunityItem>.self
        ).item
    }

    private func request<ResponseType: Decodable>(
        path: String,
        method: String = "GET",
        query: [URLQueryItem] = [],
        token: String? = nil,
        context: APIRequestContext = .admin,
        body: Encodable? = nil,
        response: ResponseType.Type
    ) async throws -> ResponseType {
        let retryable = method == "GET"
        var lastError: APIError?

        for attempt in 0..<(retryable ? 2 : 1) {
            do {
                return try await requestOnce(
                    path: path,
                    method: method,
                    query: query,
                    token: token,
                    body: body,
                    response: response
                )
            } catch let error as APIError {
                lastError = error
                if attempt == 0, retryable, error.isRetryable {
                    try? await Task.sleep(for: .milliseconds(350))
                    continue
                }
                throw adapt(error, for: context)
            } catch let error as URLError {
                let transport = APIError.transport(error)
                lastError = transport
                if attempt == 0, retryable, transport.isRetryable {
                    try? await Task.sleep(for: .milliseconds(350))
                    continue
                }
                throw adapt(transport, for: context)
            } catch {
                let fallback = APIError.invalidResponse(status: nil)
                lastError = fallback
                throw adapt(fallback, for: context)
            }
        }

        throw adapt(lastError ?? .invalidResponse(status: nil), for: context)
    }

    private func requestOnce<ResponseType: Decodable>(
        path: String,
        method: String,
        query: [URLQueryItem],
        token: String?,
        body: Encodable?,
        response: ResponseType.Type
    ) async throws -> ResponseType {
        guard var components = URLComponents(url: baseURL.appending(path: path), resolvingAgainstBaseURL: false) else {
            throw APIError.invalidURL
        }
        if !query.isEmpty {
            components.queryItems = query
        }
        guard let url = components.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.httpBody = try encoder.encode(AnyEncodable(body))
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch let error as URLError {
            throw APIError.transport(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse(status: nil)
        }
        let statusCode = httpResponse.statusCode
        guard httpResponse.value(forHTTPHeaderField: "Content-Type")?.lowercased().contains("application/json") == true else {
            throw APIError.invalidContentType(status: statusCode)
        }

        if !(200...299).contains(statusCode) {
            let payload = try? decoder.decode(ServerErrorPayload.self, from: data)
            let message = payload?.message?.nonEmpty ?? payload?.error?.nonEmpty ?? "Error del servicio (\(statusCode))."
            throw APIError.server(status: statusCode, message: message)
        }

        do {
            return try decoder.decode(ResponseType.self, from: data)
        } catch {
            throw APIError.invalidResponse(status: statusCode)
        }
    }

    private func adapt(_ error: APIError, for context: APIRequestContext) -> APIError {
        switch context {
        case .publishedEdition:
            return error
        case .communityRead:
            return .userFacing("No pudimos actualizar la comunidad ahora.")
        case .communitySubmit:
            switch error {
            case .server(let status, _) where status == 429:
                return .userFacing("Tu aporte ya fue recibido recientemente. Intenta de nuevo en un momento.")
            case .server(let status, let message) where status == 400 || status == 422:
                return .userFacing(message)
            default:
                return .userFacing("Tu aporte no pudo enviarse ahora. Intenta más tarde.")
            }
        case .admin:
            return error
        }
    }
}

private struct ServerErrorPayload: Decodable {
    let error: String?
    let message: String?
}

private extension APIError {
    var isRetryable: Bool {
        switch self {
        case .transport(let error):
            return [
                .timedOut,
                .cannotFindHost,
                .cannotConnectToHost,
                .networkConnectionLost,
                .notConnectedToInternet,
                .dnsLookupFailed,
                .resourceUnavailable,
            ].contains(error.code)
        case .server(let status, _):
            return [408, 429, 500, 502, 503, 504].contains(status)
        case .invalidContentType(let status):
            guard let status else { return true }
            return [403, 502, 503, 504].contains(status)
        case .invalidResponse(let status):
            guard let status else { return true }
            return [502, 503, 504].contains(status)
        default:
            return false
        }
    }
}

private extension String {
    var nonEmpty: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}

private struct AnyEncodable: Encodable {
    private let encodeClosure: (Encoder) throws -> Void

    init(_ wrapped: Encodable) {
        encodeClosure = { encoder in
            try wrapped.encode(to: encoder)
        }
    }

    func encode(to encoder: Encoder) throws {
        try encodeClosure(encoder)
    }
}
