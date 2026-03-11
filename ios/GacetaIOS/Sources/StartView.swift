import SwiftUI

struct StartView: View {
    @Environment(\.openURL) private var openURL
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @EnvironmentObject private var model: AppModel
    @Binding var selectedTab: RootTab
    @Binding var isShowingSettings: Bool

    @State private var shareItems: [Any] = []
    @State private var isShowingShareSheet = false

    private var content: IssueContent { model.content }
    private var brand: BrandConfig { model.brandConfig }
    private var theme: AppTheme { model.theme }
    private var singleColumn: Bool { horizontalSizeClass == .compact || dynamicTypeSize.isAccessibilitySize }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: theme.sectionSpacing * 0.5) {
                hero
                quickFacts
                chapterHighlights
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
        .background(backgroundGradient)
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

    private var backgroundGradient: some View {
        LinearGradient(
            colors: [theme.paper, theme.paperAlt, theme.mist],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .overlay(alignment: .topTrailing) {
            Circle()
                .fill(theme.warm.opacity(0.08))
                .frame(width: 240, height: 240)
                .offset(x: 80, y: -120)
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 18) {
                EditorialSurface(cornerRadius: theme.radiusXLarge) {
                    VStack(alignment: .leading, spacing: 18) {
                        HStack(spacing: 12) {
                            Image("BrandMark")
                                .resizable()
                                .scaledToFit()
                                .frame(width: 34, height: 34)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(brand.siteName)
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(theme.inkSoft)
                                Text(brand.masthead)
                                    .font(.headline.weight(.black))
                                    .foregroundStyle(theme.ink)
                                    .lineLimit(2)
                            }

                            Spacer(minLength: 0)
                        }

                        Text(content.metadata.editionLabel.uppercased())
                            .font(.system(.caption, design: .rounded, weight: .bold))
                            .tracking(2)
                            .foregroundStyle(theme.warm)

                    Text(content.cover.title)
                        .font(.system(.largeTitle, design: .serif, weight: .black))
                        .foregroundStyle(theme.ink)
                        .fixedSize(horizontal: false, vertical: true)

                    Text(content.cover.titleAccent)
                        .font(.system(.title, design: .serif, weight: .bold))
                        .foregroundStyle(theme.warm)
                        .fixedSize(horizontal: false, vertical: true)

                    Text(content.cover.summary)
                        .font(.system(.body, design: .serif))
                        .foregroundStyle(theme.inkSoft)

                    LazyVGrid(columns: AdaptiveColumns.compactAware(compact: singleColumn, accessibility: dynamicTypeSize.isAccessibilitySize), spacing: 10) {
                        heroMetaCard(title: "Fecha", value: content.metadata.publishedDisplay)
                        heroMetaCard(title: "Fuentes", value: "\(content.sources.items.count)")
                        heroMetaCard(title: "PDFs", value: "\(content.resources.pdfs.count)")
                    }

                    AssetImageView(path: content.metadata.heroImage.src)
                        .frame(height: singleColumn ? 220 : 260)
                        .clipShape(RoundedRectangle(cornerRadius: theme.radiusLarge, style: .continuous))

                    Text(content.metadata.heroImage.caption)
                        .font(.footnote)
                        .foregroundStyle(theme.inkSoft)

                    VStack(spacing: 12) {
                        Button {
                            shareItems = [content.share.title, content.share.summary, URL(string: content.metadata.canonicalURL)!]
                            isShowingShareSheet = true
                        } label: {
                            Label("Compartir", systemImage: "square.and.arrow.up")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(theme.warm)

                        Button {
                            UIPasteboard.general.string = content.share.quote
                        } label: {
                            Label(content.cover.campaign.copyQuoteLabel, systemImage: "quote.opening")
                                .font(.headline)
                        }
                        .buttonStyle(.bordered)
                        .tint(theme.warm)
                    }

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(content.share.hashtags, id: \.self) { tag in
                                Button("#\(tag)") {
                                    if let url = URL(string: "https://x.com/hashtag/\(tag)") {
                                        openURL(url)
                                    }
                                }
                                .buttonStyle(.bordered)
                                .tint(theme.warm)
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Ir directo")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(theme.warm)

                        LazyVGrid(columns: AdaptiveColumns.compactAware(compact: singleColumn, accessibility: dynamicTypeSize.isAccessibilitySize), spacing: 10) {
                            tabShortcut(title: "Ruta", systemImage: "point.3.connected.trianglepath.dotted", tab: .route)
                            tabShortcut(title: "Biblioteca", systemImage: "books.vertical.fill", tab: .library)
                            tabShortcut(title: "Comunidad", systemImage: "person.3.fill", tab: .community)
                        }
                    }
                }
            }

            EditorialSurface(cornerRadius: theme.radiusLarge) {
                VStack(alignment: .leading, spacing: 12) {
                    Label(content.cover.damageMap.title, systemImage: "waveform.path.ecg")
                        .font(.headline)
                        .foregroundStyle(theme.sand)
                    Text(content.cover.damageMap.subtitle)
                        .foregroundStyle(theme.cream.opacity(0.8))

                    ForEach(content.cover.damageMap.metrics) { metric in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(metric.label)
                                Spacer()
                                Text(metric.note)
                                    .foregroundStyle(theme.sand)
                            }
                            .font(.subheadline)
                            .foregroundStyle(theme.cream)

                            ProgressView(value: Double(metric.value), total: 100)
                                .tint(theme.warmAlt)
                        }
                    }
                }
                .padding(4)
                .background(
                    RoundedRectangle(cornerRadius: theme.radiusLarge, style: .continuous)
                        .fill(theme.cacao)
                )
            }
        }
    }

    private func heroMetaCard(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title.uppercased())
                .font(.system(.caption2, design: .rounded, weight: .bold))
                .tracking(1.2)
                .foregroundStyle(theme.warm)
            Text(value)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(theme.ink)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(theme.whiteGlassStrong, in: RoundedRectangle(cornerRadius: theme.radiusMedium, style: .continuous))
    }

    private func tabShortcut(title: String, systemImage: String, tab: RootTab) -> some View {
        Button {
            selectedTab = tab
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                Image(systemName: systemImage)
                    .font(.headline)
                Text(title)
                    .font(.footnote.weight(.semibold))
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 12)
            .padding(.vertical, 14)
            .background(theme.whiteGlass, in: RoundedRectangle(cornerRadius: theme.radiusLarge, style: .continuous))
        }
        .buttonStyle(.plain)
        .foregroundStyle(theme.ink)
    }

    private var quickFacts: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Claves rápidas")
                .font(.system(.title2, design: .serif, weight: .black))
                .foregroundStyle(theme.ink)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 14) {
                    ForEach(content.cover.quickFacts) { fact in
                        EditorialSurface(cornerRadius: theme.radiusLarge) {
                            VStack(alignment: .leading, spacing: 10) {
                                Text(fact.title.uppercased())
                                    .font(.system(.caption, design: .rounded, weight: .bold))
                                    .tracking(1.5)
                                    .foregroundStyle(theme.warm)
                                Text(fact.text)
                                    .font(.system(.body, design: .serif))
                                    .foregroundStyle(theme.inkSoft)
                            }
                            .frame(width: singleColumn ? 280 : 260, alignment: .leading)
                        }
                    }
                }
            }

            LazyVGrid(columns: AdaptiveColumns.compactAware(compact: singleColumn, accessibility: dynamicTypeSize.isAccessibilitySize), spacing: 12) {
                ForEach(content.cover.keyFigures.items) { item in
                    EditorialSurface(cornerRadius: theme.radiusLarge) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(item.value)
                                .font(.system(.title, design: .serif, weight: .black))
                                .foregroundStyle(theme.warm)
                            Text(item.label)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(theme.ink)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
        }
    }

    private var chapterHighlights: some View {
        VStack(alignment: .leading, spacing: 22) {
            chapterCard(
                eyebrow: content.problem.eyebrow,
                title: content.problem.title,
                summary: content.problem.summary
            ) {
                VStack(spacing: 12) {
                    ForEach(content.problem.cards) { item in
                        HStack(alignment: .top, spacing: 12) {
                            Image(systemName: sfSymbol(for: item.icon))
                                .font(.title3)
                                .foregroundStyle(theme.warm)
                                .frame(width: 30)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.title)
                                    .font(.headline)
                                    .foregroundStyle(theme.ink)
                                Text(item.text)
                                    .font(.subheadline)
                                    .foregroundStyle(theme.inkSoft)
                            }
                        }
                    }
                }
            }

            chapterCard(
                eyebrow: content.context.eyebrow,
                title: content.context.title,
                summary: content.context.summary
            ) {
                LazyVGrid(columns: AdaptiveColumns.compactAware(compact: singleColumn, accessibility: dynamicTypeSize.isAccessibilitySize), spacing: 12) {
                    ForEach(content.context.statCards) { stat in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(stat.number)
                                .font(.system(.title2, design: .serif, weight: .black))
                                .foregroundStyle(theme.warm)
                            Text(stat.label)
                                .font(.headline)
                                .foregroundStyle(theme.ink)
                            Text(stat.description)
                                .font(.footnote)
                                .foregroundStyle(theme.inkSoft)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }

            chapterCard(
                eyebrow: content.impact.eyebrow,
                title: content.impact.title,
                summary: content.impact.summary,
                dark: true
            ) {
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(content.impact.effects, id: \.self) { effect in
                        Label(effect, systemImage: "checkmark.circle.fill")
                            .font(.subheadline)
                            .foregroundStyle(theme.cream)
                    }
                }
            }

            chapterCard(
                eyebrow: content.data.eyebrow,
                title: content.data.title,
                summary: content.data.summary
            ) {
                VStack(alignment: .leading, spacing: 12) {
                    ForEach(content.data.legalFrame.items) { item in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(item.title)
                                .font(.headline)
                                .foregroundStyle(theme.ink)
                            Text(item.text)
                                .font(.subheadline)
                                .foregroundStyle(theme.inkSoft)
                            if let sanction = item.sanction {
                                Text(sanction)
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(theme.warm)
                            }
                        }
                        if item.id != content.data.legalFrame.items.last?.id {
                            Divider()
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func chapterCard<Content: View>(eyebrow: String, title: String, summary: String, dark: Bool = false, @ViewBuilder content innerContent: () -> Content) -> some View {
        EditorialSurface(cornerRadius: theme.radiusXLarge) {
            VStack(alignment: .leading, spacing: 14) {
                Text(eyebrow.uppercased())
                    .font(.system(.caption, design: .rounded, weight: .bold))
                    .tracking(2)
                    .foregroundStyle(dark ? theme.sand : theme.warm)
                Text(title)
                    .font(.system(.title2, design: .serif, weight: .black))
                    .foregroundStyle(dark ? theme.cream : theme.ink)
                Text(summary)
                    .font(.system(.body, design: .serif))
                    .foregroundStyle(dark ? theme.cream.opacity(0.78) : theme.inkSoft)
                innerContent()
            }
            .padding(4)
            .background(
                RoundedRectangle(cornerRadius: theme.radiusXLarge, style: .continuous)
                    .fill(dark ? theme.cacao : theme.whiteGlass)
            )
        }
    }

    private func sfSymbol(for icon: String) -> String {
        switch icon {
        case "home": return "house.fill"
        case "heart-pulse": return "heart.text.square.fill"
        case "gavel": return "building.columns.fill"
        default: return "sparkles"
        }
    }
}
