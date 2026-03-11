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

    init(bundle: Bundle = .main) {
        let environmentRaw = bundle.object(forInfoDictionaryKey: "APIEnvironment") as? String ?? AppEnvironment.production.rawValue
        environment = AppEnvironment(rawValue: environmentRaw) ?? .production

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
            contentPayload: fallbackContent,
            createdAt: fallbackContent.metadata.publishedDateISO,
            updatedAt: fallbackContent.metadata.publishedDateISO
        )
        content = fallbackContent
        brandConfig = fallbackBrand
        let tokens = AppModel.load("tokens", bundle: bundle, decoder: decoder) as DesignTokens
        theme = AppTheme.from(tokens)
        apiClient = APIClient(baseURL: config.apiBaseURL)
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
}

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case invalidContentType
    case server(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "URL inválida."
        case .invalidResponse:
            return "Respuesta inválida del servidor."
        case .invalidContentType:
            return "El servidor respondió con un formato no JSON."
        case .server(let message):
            return message
        }
    }
}

final class APIClient: @unchecked Sendable {
    private let baseURL: URL
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
        decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
    }

    func fetchCurrentEdition() async throws -> EditionEnvelope {
        try await request(path: "issues/current", response: EditionEnvelope.self)
    }

    func fetchCommunity(kind: CommunityKind, limit: Int = 20) async throws -> [CommunityPost] {
        try await request(
            path: "community",
            query: [
                URLQueryItem(name: "kind", value: kind.rawValue),
                URLQueryItem(name: "limit", value: String(limit))
            ],
            response: ItemsEnvelope<CommunityPost>.self
        ).items.filter(\.approved)
    }

    func submitCommunity(_ input: CommunityPostInput) async throws -> CommunityPost {
        try await request(path: "community", method: "POST", body: input, response: ItemEnvelope<CommunityPost>.self).item
    }

    func fetchAdminEditions(token: String, limit: Int = 40) async throws -> [AdminEdition] {
        try await request(
            path: "admin/editions",
            query: [URLQueryItem(name: "limit", value: String(limit))],
            token: token,
            response: ItemsEnvelope<AdminEdition>.self
        ).items
    }

    func createEdition(token: String, input: CreateEditionInput) async throws -> AdminEdition {
        try await request(path: "admin/editions", method: "POST", token: token, body: input, response: ItemEnvelope<AdminEdition>.self).item
    }

    func fetchAdminCommunity(token: String, status: CommunityModerationStatus, limit: Int = 60) async throws -> [AdminCommunityItem] {
        try await request(
            path: "admin/community",
            query: [
                URLQueryItem(name: "status", value: status.rawValue),
                URLQueryItem(name: "limit", value: String(limit))
            ],
            token: token,
            response: ItemsEnvelope<AdminCommunityItem>.self
        ).items
    }

    func moderateCommunity(token: String, id: String, action: CommunityModerationAction) async throws -> AdminCommunityItem {
        struct ModerateBody: Encodable { let action: CommunityModerationAction }
        return try await request(
            path: "admin/community/\(id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? id)/moderate",
            method: "POST",
            token: token,
            body: ModerateBody(action: action),
            response: ItemEnvelope<AdminCommunityItem>.self
        ).item
    }

    private func request<ResponseType: Decodable>(
        path: String,
        method: String = "GET",
        query: [URLQueryItem] = [],
        token: String? = nil,
        body: Encodable? = nil,
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

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard httpResponse.value(forHTTPHeaderField: "Content-Type")?.lowercased().contains("application/json") == true else {
            throw APIError.invalidContentType
        }

        if !(200...299).contains(httpResponse.statusCode) {
            let message = (try? decoder.decode(ServerErrorPayload.self, from: data).error).flatMap { $0.isEmpty ? nil : $0 } ?? "Error del servicio (\(httpResponse.statusCode))."
            throw APIError.server(message)
        }

        do {
            return try decoder.decode(ResponseType.self, from: data)
        } catch {
            throw APIError.invalidResponse
        }
    }
}

private struct ServerErrorPayload: Decodable {
    let error: String
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
