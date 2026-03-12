import XCTest
import SwiftUI
import UIKit

final class GacetaIOSSharedDataTests: XCTestCase {
    func testIssueContentDecodesCoreSections() throws {
        let content: IssueContent = try decodeFixture(
            relativePath: "app/shared/content/issue-content.json",
            as: IssueContent.self
        )

        XCTAssertEqual(content.id, "gaceta-eje-central")
        XCTAssertEqual(content.metadata.version, "2.3.0")
        XCTAssertFalse(content.cover.title.isEmpty)
        XCTAssertGreaterThanOrEqual(content.problem.cards.count, 3)
        XCTAssertGreaterThanOrEqual(content.resources.pdfs.count, 3)
        XCTAssertFalse(content.community.comments.reviewMessage.isEmpty)
    }

    func testBrandConfigDecodesReleaseAssets() throws {
        let brand: BrandConfig = try decodeFixture(
            relativePath: "app/shared/content/brand-config.json",
            as: BrandConfig.self
        )

        XCTAssertEqual(brand.masthead, "Gaceta Tu Espacio Eje Central")
        XCTAssertEqual(brand.webIconPack.appleTouchIcon, "/apple-touch-icon.png")
        XCTAssertEqual(brand.webIconPack.manifestIcon, "/web-app-manifest-512.png")
        XCTAssertTrue(brand.supportLinks.siteURL.hasPrefix("https://"))
    }

    func testCommunityFixturesDecodeForScreenshotMode() throws {
        let fixtures: BundledCommunityFixtures = try decodeFixture(
            relativePath: "app/shared/content/community-fixtures.json",
            as: BundledCommunityFixtures.self
        )

        XCTAssertEqual(fixtures.comments.count, 2)
        XCTAssertEqual(fixtures.histories.count, 2)
        XCTAssertTrue(fixtures.comments.allSatisfy(\.approved))
        XCTAssertTrue(fixtures.histories.allSatisfy(\.approved))
    }

    func testDesignTokensDecodeIntoTheme() throws {
        let tokens: DesignTokens = try decodeFixture(
            relativePath: "app/shared/design/tokens.json",
            as: DesignTokens.self
        )

        let theme = AppTheme.from(tokens)

        XCTAssertEqual(tokens.n4?.platform.ios.value.minimumOS, "18.0")
        XCTAssertEqual(theme.radiusLarge, 28, accuracy: 0.001)
        XCTAssertEqual(theme.radiusXLarge, 34, accuracy: 0.001)
        XCTAssertEqual(theme.sectionSpacing, 72, accuracy: 0.001)
    }

    func testThemeColorParsingHandlesHexAndRGBA() {
        XCTAssertEqual(UIColor(Color(tokenString: "#18120e")).cgColor.components?.count, 4)
        XCTAssertEqual(UIColor(Color(tokenString: "rgba(255,255,255,0.82)")).cgColor.alpha, 0.82, accuracy: 0.001)
    }

    func testDeepLinkParserHandlesCustomSchemeAndUniversalLinks() throws {
        let content: IssueContent = try decodeFixture(
            relativePath: "app/shared/content/issue-content.json",
            as: IssueContent.self
        )

        XCTAssertEqual(AppDeepLinkParser.parse(url: URL(string: "gacetaeje://inicio")!, content: content), .start)
        XCTAssertEqual(AppDeepLinkParser.parse(url: URL(string: "gacetaeje://ruta")!, content: content), .route)
        XCTAssertEqual(
            AppDeepLinkParser.parse(url: URL(string: "gacetaeje://edicion/gaceta-eje-central")!, content: content),
            .edition("gaceta-eje-central")
        )
        XCTAssertEqual(AppDeepLinkParser.parse(url: URL(string: "gacetaeje://recurso/ley-condominio")!, content: content), .resource("ley-condominio"))
        XCTAssertEqual(
            AppDeepLinkParser.parse(url: URL(string: "https://yosoymx.com/gaceta-eje-central/comunidad")!, content: content),
            .community
        )
        XCTAssertEqual(
            AppDeepLinkParser.parse(url: URL(string: "https://yosoymx.com/gaceta-eje-central/edicion/edicion-anterior")!, content: content),
            .edition("edicion-anterior")
        )
        XCTAssertEqual(
            AppDeepLinkParser.parse(url: URL(string: "https://yosoymx.com/gaceta-eje-central/recurso/no-existe")!, content: content),
            .library
        )
    }

    private func decodeFixture<T: Decodable>(relativePath: String, as type: T.Type) throws -> T {
        let sourceURL = URL(fileURLWithPath: #filePath)
        let repoRoot = sourceURL
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        let fileURL = repoRoot.appendingPathComponent(relativePath)
        let data = try Data(contentsOf: fileURL)
        return try JSONDecoder().decode(T.self, from: data)
    }
}
