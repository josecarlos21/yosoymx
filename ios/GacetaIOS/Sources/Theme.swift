import SwiftUI

struct TokenLeaf<Value: Decodable>: Decodable {
    let type: String
    let value: Value

    enum CodingKeys: String, CodingKey {
        case type = "$type"
        case value = "$value"
    }
}

struct DesignTokens: Decodable {
    let n0: PrimitiveTokens
    let n4: PlatformOverrides?
}

struct PrimitiveTokens: Decodable {
    let color: PrimitiveColors
    let radius: PrimitiveRadius
    let spacing: PrimitiveSpacing
}

struct PrimitiveColors: Decodable {
    let ink: TokenLeaf<String>
    let inkSoft: TokenLeaf<String>
    let paper: TokenLeaf<String>
    let paperAlt: TokenLeaf<String>
    let cream: TokenLeaf<String>
    let mist: TokenLeaf<String>
    let warm: TokenLeaf<String>
    let warmAlt: TokenLeaf<String>
    let cacao: TokenLeaf<String>
    let sand: TokenLeaf<String>
    let line: TokenLeaf<String>
    let whiteGlass: TokenLeaf<String>
    let whiteGlassStrong: TokenLeaf<String>
}

struct PrimitiveRadius: Decodable {
    let sm: TokenLeaf<Double>
    let md: TokenLeaf<Double>
    let lg: TokenLeaf<Double>
    let xl: TokenLeaf<Double>
    let pill: TokenLeaf<Double>
}

struct PrimitiveSpacing: Decodable {
    let xs: TokenLeaf<Double>
    let sm: TokenLeaf<Double>
    let md: TokenLeaf<Double>
    let lg: TokenLeaf<Double>
    let xl: TokenLeaf<Double>
    let xxl: TokenLeaf<Double>
    let sectionY: TokenLeaf<Double>
}

struct PlatformOverrides: Decodable {
    let platform: PlatformTokenContainer
}

struct PlatformTokenContainer: Decodable {
    let ios: TokenLeaf<IOSPlatformToken>
}

struct IOSPlatformToken: Decodable {
    let minimumOS: String
    let tabBarStyle: String
    let cardMaterial: String
}

struct AppTheme {
    let ink: Color
    let inkSoft: Color
    let paper: Color
    let paperAlt: Color
    let cream: Color
    let mist: Color
    let warm: Color
    let warmAlt: Color
    let cacao: Color
    let sand: Color
    let line: Color
    let whiteGlass: Color
    let whiteGlassStrong: Color
    let radiusSmall: CGFloat
    let radiusMedium: CGFloat
    let radiusLarge: CGFloat
    let radiusXLarge: CGFloat
    let spacingSmall: CGFloat
    let spacingMedium: CGFloat
    let spacingLarge: CGFloat
    let spacingXLarge: CGFloat
    let sectionSpacing: CGFloat

    static func from(_ tokens: DesignTokens) -> AppTheme {
        AppTheme(
            ink: Color(tokenString: tokens.n0.color.ink.value),
            inkSoft: Color(tokenString: tokens.n0.color.inkSoft.value),
            paper: Color(tokenString: tokens.n0.color.paper.value),
            paperAlt: Color(tokenString: tokens.n0.color.paperAlt.value),
            cream: Color(tokenString: tokens.n0.color.cream.value),
            mist: Color(tokenString: tokens.n0.color.mist.value),
            warm: Color(tokenString: tokens.n0.color.warm.value),
            warmAlt: Color(tokenString: tokens.n0.color.warmAlt.value),
            cacao: Color(tokenString: tokens.n0.color.cacao.value),
            sand: Color(tokenString: tokens.n0.color.sand.value),
            line: Color(tokenString: tokens.n0.color.line.value),
            whiteGlass: Color(tokenString: tokens.n0.color.whiteGlass.value),
            whiteGlassStrong: Color(tokenString: tokens.n0.color.whiteGlassStrong.value),
            radiusSmall: CGFloat(tokens.n0.radius.sm.value),
            radiusMedium: CGFloat(tokens.n0.radius.md.value),
            radiusLarge: CGFloat(tokens.n0.radius.lg.value),
            radiusXLarge: CGFloat(tokens.n0.radius.xl.value),
            spacingSmall: CGFloat(tokens.n0.spacing.sm.value),
            spacingMedium: CGFloat(tokens.n0.spacing.md.value),
            spacingLarge: CGFloat(tokens.n0.spacing.lg.value),
            spacingXLarge: CGFloat(tokens.n0.spacing.xl.value),
            sectionSpacing: CGFloat(tokens.n0.spacing.sectionY.value)
        )
    }
}

extension Color {
    init(tokenString: String) {
        let value = tokenString.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()

        if value.hasPrefix("#") {
            let hex = String(value.dropFirst())
            let expanded: String
            if hex.count == 3 {
                expanded = hex.map { "\($0)\($0)" }.joined()
            } else {
                expanded = hex
            }

            if let number = UInt64(expanded, radix: 16) {
                let red = Double((number >> 16) & 0xff) / 255
                let green = Double((number >> 8) & 0xff) / 255
                let blue = Double(number & 0xff) / 255
                self = Color(.sRGB, red: red, green: green, blue: blue, opacity: 1)
                return
            }
        }

        if value.hasPrefix("rgba("), value.hasSuffix(")") {
            let body = value.dropFirst(5).dropLast()
            let parts = body.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
            if parts.count == 4,
               let red = Double(parts[0]),
               let green = Double(parts[1]),
               let blue = Double(parts[2]),
               let alpha = Double(parts[3]) {
                self = Color(.sRGB, red: red / 255, green: green / 255, blue: blue / 255, opacity: alpha)
                return
            }
        }

        self = .primary
    }
}
