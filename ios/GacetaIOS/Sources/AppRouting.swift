import Foundation

enum AppDeepLink: Equatable {
    case start
    case route
    case library
    case community
    case contact
    case edition(String)
    case resource(String)
}

enum LibraryDestination: Hashable {
    case document(String)
}

enum AppDeepLinkParser {
    static func parse(url: URL, content: IssueContent) -> AppDeepLink? {
        guard let scheme = url.scheme?.lowercased() else { return nil }

        switch scheme {
        case "gacetaeje":
            return parseCustomScheme(url: url, content: content)
        case "http", "https":
            return parseWebURL(url: url, content: content)
        default:
            return nil
        }
    }

    private static func parseCustomScheme(url: URL, content: IssueContent) -> AppDeepLink {
        let segments = customSegments(from: url)
        return parseSegments(segments, content: content)
    }

    private static func parseWebURL(url: URL, content: IssueContent) -> AppDeepLink? {
        guard let host = url.host?.lowercased(), host == "yosoymx.com" else { return nil }
        let segments = url.pathComponents.filter { $0 != "/" }

        guard !segments.isEmpty else { return .start }
        if segments.first == "privacy" {
            return nil
        }
        guard segments.first == content.id else { return .start }
        return parseSegments(Array(segments.dropFirst()), content: content)
    }

    private static func parseSegments(_ rawSegments: [String], content: IssueContent) -> AppDeepLink {
        let segments = rawSegments
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }
            .filter { !$0.isEmpty }

        guard let first = segments.first else { return .start }

        switch first {
        case "inicio", "portada":
            return .start
        case "archivo":
            return .start
        case "ruta", "rutas":
            return .route
        case "biblioteca", "recursos":
            return .library
        case "comunidad", "comentarios", "historial":
            return .community
        case "contacto", "soporte", "ajustes":
            return .contact
        case "edicion":
            guard let slug = segments.dropFirst().first, !slug.isEmpty else { return .start }
            return .edition(slug)
        case "recurso":
            guard let slug = segments.dropFirst().first else { return .library }
            return content.matchingResource(for: slug).map(AppDeepLink.resource) ?? .library
        default:
            return .start
        }
    }

    private static func customSegments(from url: URL) -> [String] {
        var segments: [String] = []
        if let host = url.host?.trimmingCharacters(in: .whitespacesAndNewlines), !host.isEmpty {
            segments.append(host)
        }
        segments.append(contentsOf: url.pathComponents.filter { $0 != "/" })
        return segments
    }
}

private extension IssueContent {
    func matchingResource(for slug: String) -> String? {
        let normalizedSlug = AppDeepLinkParser.normalize(slug)
        guard !normalizedSlug.isEmpty else { return nil }

        return resources.pdfs.first(where: { resource in
            let hrefBase = ((resource.href as NSString).lastPathComponent as NSString).deletingPathExtension
            let fileBase = (resource.fileName as NSString).deletingPathExtension
            return [
                AppDeepLinkParser.normalize(resource.id),
                AppDeepLinkParser.normalize(fileBase),
                AppDeepLinkParser.normalize(hrefBase),
            ].contains(normalizedSlug)
        })?.id
    }
}

private extension AppDeepLinkParser {
    static func normalize(_ raw: String) -> String {
        raw
            .lowercased()
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: ".pdf", with: "")
            .replacingOccurrences(of: "_", with: "-")
    }
}
