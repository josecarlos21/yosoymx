import SwiftUI

struct RouteView: View {
    @Environment(\.openURL) private var openURL
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @EnvironmentObject private var model: AppModel
    @Binding var isShowingSettings: Bool

    @State private var shareItems: [Any] = []
    @State private var isShowingShareSheet = false

    private var content: IssueContent { model.content }
    private var brand: BrandConfig { model.brandConfig }
    private var theme: AppTheme { model.theme }
    private var stackedActions: Bool { horizontalSizeClass == .compact || dynamicTypeSize.isAccessibilitySize }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                EditorialSurface(cornerRadius: theme.radiusXLarge) {
                    VStack(alignment: .leading, spacing: 14) {
                        Text(content.routes.eyebrow.uppercased())
                            .font(.system(.caption, design: .rounded, weight: .bold))
                            .tracking(2)
                            .foregroundStyle(theme.warm)
                        Text(content.routes.title)
                            .font(.system(.largeTitle, design: .serif, weight: .black))
                            .foregroundStyle(theme.ink)
                        Text(content.routes.summary)
                            .font(.system(.body, design: .serif))
                            .foregroundStyle(theme.inkSoft)
                    }
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("Autoridades")
                        .font(.system(.title2, design: .serif, weight: .black))
                        .foregroundStyle(theme.ink)

                    ForEach(content.routes.authorities) { authority in
                        Button {
                            if let url = URL(string: authority.href) {
                                openURL(url)
                            }
                        } label: {
                            EditorialSurface(cornerRadius: theme.radiusLarge) {
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Text(authority.label)
                                            .font(.caption.weight(.bold))
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 6)
                                            .background(theme.warm.opacity(0.12), in: Capsule())
                                            .foregroundStyle(theme.warm)
                                        Spacer()
                                        Image(systemName: "arrow.up.right")
                                            .foregroundStyle(theme.warm)
                                    }
                                    Text(authority.title)
                                        .font(.headline)
                                        .foregroundStyle(theme.ink)
                                        .lineLimit(3)
                                        .fixedSize(horizontal: false, vertical: true)
                                    Text(authority.text)
                                        .font(.subheadline)
                                        .foregroundStyle(theme.inkSoft)
                                        .lineSpacing(2)
                                        .fixedSize(horizontal: false, vertical: true)
                                    Text(authority.meta)
                                        .font(.footnote)
                                        .foregroundStyle(theme.warm)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }

                EditorialSurface(cornerRadius: theme.radiusXLarge) {
                    VStack(alignment: .leading, spacing: 14) {
                        Text(content.routes.evidenceChecklist.title)
                            .font(.system(.title3, design: .serif, weight: .black))
                            .foregroundStyle(theme.ink)
                        ForEach(Array(content.routes.evidenceChecklist.items.enumerated()), id: \.offset) { index, item in
                            HStack(alignment: .top, spacing: 12) {
                                Text("\(index + 1)")
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(theme.cream)
                                    .frame(width: 22, height: 22)
                                    .background(theme.warm, in: Circle())
                                Text(item)
                                    .font(.subheadline)
                                    .foregroundStyle(theme.inkSoft)
                            }
                        }
                    }
                }

                EditorialSurface(cornerRadius: theme.radiusXLarge) {
                    VStack(alignment: .leading, spacing: 14) {
                        Text(content.action.title)
                            .font(.system(.title2, design: .serif, weight: .black))
                            .foregroundStyle(theme.ink)
                        Text(content.action.summary)
                            .font(.system(.body, design: .serif))
                            .foregroundStyle(theme.inkSoft)

                        VStack(alignment: .leading, spacing: 8) {
                            Text(content.action.howToUse.title)
                                .font(.headline)
                                .foregroundStyle(theme.warm)
                            ForEach(content.action.howToUse.steps, id: \.self) { step in
                                Text(step)
                                    .font(.subheadline)
                                    .foregroundStyle(theme.inkSoft)
                            }
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text(content.action.recommendation.title)
                                .font(.headline)
                                .foregroundStyle(theme.warm)
                            Text(content.action.recommendation.text)
                                .font(.subheadline)
                                .foregroundStyle(theme.inkSoft)
                        }

                        Group {
                            if stackedActions {
                                VStack(spacing: 12) {
                                    copyButton
                                    shareButton
                                }
                            } else {
                                HStack(spacing: 12) {
                                    copyButton
                                    shareButton
                                }
                            }
                        }

                        Text(content.action.draft)
                            .font(.system(.footnote, design: .monospaced))
                            .foregroundStyle(theme.inkSoft)
                            .textSelection(.enabled)
                            .padding()
                            .background(theme.cream, in: RoundedRectangle(cornerRadius: theme.radiusLarge, style: .continuous))
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
        .background(
            LinearGradient(colors: [theme.paper, theme.mist], startPoint: .topLeading, endPoint: .bottomTrailing)
        )
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                MastheadToolbarView(brand: brand, editionLabel: content.metadata.editionLabel)
            }
            ToolbarItem(placement: .topBarTrailing) {
                SupportToolbarButton(isPresented: $isShowingSettings)
            }
        }
        .sheet(isPresented: $isShowingShareSheet) {
            ShareSheet(items: shareItems)
        }
    }

    private var copyButton: some View {
        Button {
            UIPasteboard.general.string = content.action.draft
        } label: {
            Label(content.action.copyLabel, systemImage: "doc.on.doc")
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .tint(theme.warm)
    }

    private var shareButton: some View {
        Button {
            shareItems = [content.action.draft]
            isShowingShareSheet = true
        } label: {
            Label("Compartir escrito", systemImage: "square.and.arrow.up")
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.bordered)
        .tint(theme.warm)
    }
}
