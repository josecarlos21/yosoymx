import SwiftUI

struct LibraryView: View {
    @Environment(\.openURL) private var openURL
    @EnvironmentObject private var model: AppModel
    @Binding var isShowingSettings: Bool

    private var content: IssueContent { model.content }
    private var theme: AppTheme { model.theme }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                EditorialSurface(cornerRadius: theme.radiusXLarge) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(content.resources.eyebrow.uppercased())
                            .font(.system(.caption, design: .rounded, weight: .bold))
                            .tracking(2)
                            .foregroundStyle(theme.warm)
                        Text(content.resources.title)
                            .font(.system(.largeTitle, design: .serif, weight: .black))
                            .foregroundStyle(theme.ink)
                        Text(content.resources.summary)
                            .font(.system(.body, design: .serif))
                            .foregroundStyle(theme.inkSoft)

                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 3), spacing: 10) {
                            libraryCountCard(title: "PDFs", value: "\(content.resources.pdfs.count)")
                            libraryCountCard(title: "Galería", value: "\(content.gallery.items.count)")
                            libraryCountCard(title: "Fuentes", value: "\(content.sources.items.count)")
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("PDFs offline")
                        .font(.system(.title2, design: .serif, weight: .black))
                        .foregroundStyle(theme.ink)
                    ForEach(content.resources.pdfs) { resource in
                        NavigationLink {
                            DocumentDetailView(resource: resource)
                                .environmentObject(model)
                        } label: {
                            EditorialSurface(cornerRadius: theme.radiusLarge) {
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Image(systemName: "doc.richtext.fill")
                                            .foregroundStyle(theme.warm)
                                        Spacer()
                                        Image(systemName: "arrow.right")
                                            .foregroundStyle(theme.warm)
                                    }
                                    Text(resource.title)
                                        .font(.headline)
                                        .foregroundStyle(theme.ink)
                                    Text(resource.description)
                                        .font(.subheadline)
                                        .foregroundStyle(theme.inkSoft)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text(content.gallery.eyebrow)
                        .font(.headline)
                        .foregroundStyle(theme.warm)
                    Text(content.gallery.title)
                        .font(.system(.title2, design: .serif, weight: .black))
                        .foregroundStyle(theme.ink)
                    Text(content.gallery.summary)
                        .font(.system(.body, design: .serif))
                        .foregroundStyle(theme.inkSoft)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 14) {
                            ForEach(content.gallery.items) { asset in
                                VStack(alignment: .leading, spacing: 10) {
                                    AssetImageView(path: asset.fileName)
                                        .frame(width: 280, height: 220)
                                        .clipShape(RoundedRectangle(cornerRadius: theme.radiusLarge, style: .continuous))
                                    Text(asset.title)
                                        .font(.headline)
                                        .foregroundStyle(theme.ink)
                                    Text(asset.description)
                                        .font(.subheadline)
                                        .foregroundStyle(theme.inkSoft)
                                }
                                .frame(width: 280, alignment: .leading)
                            }
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text(content.sources.title)
                        .font(.system(.title2, design: .serif, weight: .black))
                        .foregroundStyle(theme.ink)
                    ForEach(content.sources.items) { source in
                        Button {
                            if let url = URL(string: source.href) {
                                openURL(url)
                            }
                        } label: {
                            EditorialSurface(cornerRadius: theme.radiusLarge) {
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Text(source.group.uppercased())
                                            .font(.system(.caption, design: .rounded, weight: .bold))
                                            .tracking(1.5)
                                            .foregroundStyle(theme.warm)
                                        Spacer()
                                        Image(systemName: "arrow.up.right")
                                            .foregroundStyle(theme.warm)
                                    }
                                    Text(source.title)
                                        .font(.headline)
                                        .foregroundStyle(theme.ink)
                                    Text(source.note)
                                        .font(.subheadline)
                                        .foregroundStyle(theme.inkSoft)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
        .background(
            LinearGradient(colors: [theme.paper, theme.paperAlt, theme.mist], startPoint: .topLeading, endPoint: .bottomTrailing)
        )
        .navigationTitle("Biblioteca")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                SupportToolbarButton(isPresented: $isShowingSettings)
            }
        }
    }

    private func libraryCountCard(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title.uppercased())
                .font(.system(.caption2, design: .rounded, weight: .bold))
                .tracking(1.2)
                .foregroundStyle(theme.warm)
            Text(value)
                .font(.system(.title3, design: .serif, weight: .black))
                .foregroundStyle(theme.ink)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(theme.whiteGlassStrong, in: RoundedRectangle(cornerRadius: theme.radiusMedium, style: .continuous))
    }
}

struct DocumentDetailView: View {
    @EnvironmentObject private var model: AppModel

    let resource: PDFResource

    @State private var shareItems: [Any] = []
    @State private var isShowingShareSheet = false

    private var theme: AppTheme { model.theme }

    var body: some View {
        Group {
            if let url = BundleResourceLocator.resourceURL(for: resource.href) {
                PDFDocumentView(url: url)
                    .background(theme.paper)
            } else {
                ContentUnavailableView("Documento no disponible", systemImage: "exclamationmark.triangle", description: Text("No se encontró el PDF empaquetado en la app."))
            }
        }
        .navigationTitle(resource.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    if let url = BundleResourceLocator.resourceURL(for: resource.href) {
                        shareItems = [url]
                        isShowingShareSheet = true
                    }
                } label: {
                    Label("Compartir", systemImage: "square.and.arrow.up")
                }
            }
        }
        .sheet(isPresented: $isShowingShareSheet) {
            ShareSheet(items: shareItems)
        }
    }
}
