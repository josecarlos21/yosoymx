import PDFKit
import SwiftUI

struct MastheadToolbarView: View {
    let brand: BrandConfig
    let editionLabel: String

    var body: some View {
        HStack(spacing: 10) {
            Image("BrandMark")
                .resizable()
                .scaledToFit()
                .frame(width: 22, height: 22)

            VStack(alignment: .leading, spacing: 1) {
                Text(brand.siteName)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
                HStack(spacing: 6) {
                    Text(brand.shortMasthead)
                        .font(.headline.weight(.black))
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                    Text(editionLabel)
                        .font(.caption2.weight(.bold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(.thinMaterial, in: Capsule())
                }
            }
        }
        .accessibilityElement(children: .combine)
    }
}

struct SupportToolbarButton: View {
    @Binding var isPresented: Bool

    var body: some View {
        Button {
            isPresented = true
        } label: {
            Label("Ajustes", systemImage: "slider.horizontal.3")
        }
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

struct AssetImageView: View {
    let path: String

    var body: some View {
        Group {
            if let image = BundleResourceLocator.image(for: path) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                ZStack {
                    LinearGradient(colors: [.orange.opacity(0.15), .brown.opacity(0.12)], startPoint: .topLeading, endPoint: .bottomTrailing)
                    Image(systemName: "photo")
                        .font(.system(size: 28, weight: .medium))
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}

struct PDFDocumentView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> PDFView {
        let view = PDFView()
        view.autoScales = true
        view.displayMode = .singlePageContinuous
        view.displayDirection = .vertical
        view.backgroundColor = .secondarySystemBackground
        view.document = PDFDocument(url: url)
        return view
    }

    func updateUIView(_ uiView: PDFView, context: Context) {
        if uiView.document?.documentURL != url {
            uiView.document = PDFDocument(url: url)
        }
    }
}

struct EditorialSurface<Content: View>: View {
    let cornerRadius: CGFloat
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(20)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(Color.white.opacity(0.35), lineWidth: 1)
            )
    }
}

struct AdaptiveColumns {
    static func compactAware(compact: Bool, accessibility: Bool, wide: Bool = false) -> [GridItem] {
        let count: Int
        if accessibility {
            count = 1
        } else if compact {
            count = 1
        } else if wide {
            count = 2
        } else {
            count = 2
        }

        return Array(repeating: GridItem(.flexible(), spacing: 12), count: count)
    }
}
