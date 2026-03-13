import SwiftUI

struct CommunityView: View {
    @EnvironmentObject private var model: AppModel
    @Binding var isShowingSettings: Bool

    @AppStorage("community.comments.cache") private var cachedCommentsData = Data()
    @AppStorage("community.histories.cache") private var cachedHistoriesData = Data()

    @State private var selectedKind: CommunityKind = .comment
    @State private var comments: [CommunityPost] = []
    @State private var histories: [CommunityPost] = []
    @State private var isLoading = false
    @State private var errorMessage = ""
    @State private var statusMessage = ""
    @State private var isShowingComposer = false

    private var content: IssueContent { model.content }
    private var brand: BrandConfig { model.brandConfig }
    private var theme: AppTheme { model.theme }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                EditorialSurface(cornerRadius: theme.radiusXLarge) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Comunidad".uppercased())
                            .font(.system(.caption, design: .rounded, weight: .bold))
                            .tracking(2)
                            .foregroundStyle(theme.warm)
                        Text(selectedKind == .comment ? content.community.comments.title : content.community.history.title)
                            .font(.system(.largeTitle, design: .serif, weight: .black))
                            .foregroundStyle(theme.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(selectedKind == .comment ? content.community.comments.summary : content.community.history.summary)
                            .font(.system(.body, design: .serif))
                            .foregroundStyle(theme.inkSoft)
                            .lineSpacing(3)
                    }
                }

                Picker("Tipo", selection: $selectedKind) {
                    Text("Comentarios").tag(CommunityKind.comment)
                    Text("Historial").tag(CommunityKind.history)
                }
                .pickerStyle(.segmented)

                EditorialSurface(cornerRadius: theme.radiusLarge) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Revisión editorial")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(theme.ink)
                        Text(selectedKind == .comment ? content.community.comments.formIntro : content.community.history.formIntro)
                            .font(.footnote)
                            .foregroundStyle(theme.inkSoft)
                            .lineSpacing(2)

                        HStack(spacing: 10) {
                            statusChip(title: "Visibles", value: "\(currentItems.count)")
                            statusChip(title: "Estado", value: "Revisión activa")
                        }
                    }
                }

                if !errorMessage.isEmpty {
                    messageBanner(text: errorMessage, systemImage: "wifi.exclamationmark", tint: theme.warm)
                }

                if !statusMessage.isEmpty {
                    messageBanner(text: statusMessage, systemImage: "checkmark.circle.fill", tint: theme.ink)
                }

                if isLoading {
                    ProgressView("Cargando comunidad…")
                        .frame(maxWidth: .infinity, alignment: .center)
                }

                ForEach(currentItems) { item in
                    EditorialSurface(cornerRadius: theme.radiusLarge) {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack(alignment: .top) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.displayName)
                                        .font(.headline.weight(.semibold))
                                        .foregroundStyle(theme.ink)
                                    if let category = item.category, !category.isEmpty {
                                        Text(category.uppercased())
                                            .font(.system(.caption, design: .rounded, weight: .bold))
                                            .tracking(1.2)
                                            .foregroundStyle(theme.warm)
                                    }
                                }
                                Spacer()
                                Text(formatDate(item.createdAt))
                                    .font(.caption)
                                    .foregroundStyle(theme.inkSoft)
                            }

                            Text(item.content)
                                .font(.system(.body, design: .serif))
                                .foregroundStyle(theme.inkSoft)
                                .lineSpacing(3)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }

                if currentItems.isEmpty, !isLoading {
                    ContentUnavailableView(
                        selectedKind == .comment ? content.community.comments.feedEmpty : content.community.history.empty,
                        systemImage: "bubble.left.and.bubble.right"
                    )
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
        .background(LinearGradient(colors: [theme.paper, theme.mist], startPoint: .topLeading, endPoint: .bottomTrailing))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                MastheadToolbarView(brand: brand, editionLabel: content.metadata.editionLabel)
            }
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button {
                    Task { await refresh() }
                } label: {
                    Label("Actualizar", systemImage: "arrow.clockwise")
                }
                SupportToolbarButton(isPresented: $isShowingSettings)
            }
        }
        .task {
            restoreCachedPosts()
            await refresh()
        }
        .refreshable {
            await refresh()
        }
        .safeAreaInset(edge: .bottom) {
            Button {
                isShowingComposer = true
            } label: {
                Label(selectedKind == .comment ? content.community.comments.submitLabel : content.community.history.submitLabel, systemImage: "square.and.pencil")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(theme.warm)
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 10)
            .background(.ultraThinMaterial)
        }
        .sheet(isPresented: $isShowingComposer) {
            CommunityComposerSheet(kind: selectedKind) { input in
                await submit(input)
            }
            .environmentObject(model)
        }
    }

    private var currentItems: [CommunityPost] {
        selectedKind == .comment ? comments : histories
    }

    @MainActor
    private func refresh() async {
        isLoading = true
        errorMessage = ""
        var didFail = false

        async let latestComments = fetchCommunitySafely(kind: .comment)
        async let latestHistories = fetchCommunitySafely(kind: .history)

        if let items = await latestComments {
            comments = items
            persistComments(items)
        } else {
            didFail = true
        }

        if let items = await latestHistories {
            histories = items
            persistHistories(items)
        } else {
            didFail = true
        }

        if didFail {
            errorMessage = currentItems.isEmpty ? "No pudimos actualizar la comunidad ahora." : "Mostramos la última actualización disponible."
        }

        isLoading = false
    }

    @MainActor
    private func submit(_ input: CommunityPostInput) async -> Bool {
        do {
            _ = try await model.apiClient.submitCommunity(input)
            statusMessage = input.kind == .comment ? content.community.comments.reviewMessage : content.community.history.reviewMessage
            isShowingComposer = false
            await refresh()
            return true
        } catch {
            errorMessage = input.kind == .comment
                ? "Tu comentario no pudo enviarse ahora. Intenta más tarde."
                : "Tu aporte no pudo enviarse ahora. Intenta más tarde."
            return false
        }
    }

    private func formatDate(_ raw: String) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "es_MX")
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        if let date = ISO8601DateFormatter().date(from: raw) {
            return formatter.string(from: date)
        }
        return raw
    }

    private func statusChip(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title.uppercased())
                .font(.system(.caption2, design: .rounded, weight: .bold))
                .tracking(1)
                .foregroundStyle(theme.warm)
            Text(value)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(theme.ink)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(theme.whiteGlassStrong, in: RoundedRectangle(cornerRadius: theme.radiusMedium, style: .continuous))
    }

    private func messageBanner(text: String, systemImage: String, tint: Color) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: systemImage)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(tint)
                .padding(.top, 2)
            Text(text)
                .font(.footnote)
                .foregroundStyle(theme.ink)
                .lineSpacing(2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(theme.whiteGlassStrong, in: RoundedRectangle(cornerRadius: theme.radiusLarge, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: theme.radiusLarge, style: .continuous)
                .strokeBorder(tint.opacity(0.18), lineWidth: 1)
        )
    }

    private func restoreCachedPosts() {
        let decoder = JSONDecoder()

        if comments.isEmpty,
           let cached = try? decoder.decode([CommunityPost].self, from: cachedCommentsData) {
            comments = cached
        }

        if histories.isEmpty,
           let cached = try? decoder.decode([CommunityPost].self, from: cachedHistoriesData) {
            histories = cached
        }
    }

    private func fetchCommunitySafely(kind: CommunityKind) async -> [CommunityPost]? {
        try? await model.apiClient.fetchCommunity(kind: kind)
    }

    private func persistComments(_ items: [CommunityPost]) {
        let encoder = JSONEncoder()
        guard let encoded = try? encoder.encode(items) else { return }
        cachedCommentsData = encoded
    }

    private func persistHistories(_ items: [CommunityPost]) {
        let encoder = JSONEncoder()
        guard let encoded = try? encoder.encode(items) else { return }
        cachedHistoriesData = encoded
    }
}

struct CommunityComposerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var model: AppModel

    let kind: CommunityKind
    let onSubmit: (CommunityPostInput) async -> Bool

    @State private var displayName = ""
    @State private var email = ""
    @State private var category = ""
    @State private var contentText = ""
    @State private var errorMessage = ""
    @State private var isSubmitting = false

    private var copy: CommunityCopy? {
        kind == .comment ? model.content.community.comments : nil
    }

    private var historyCopy: HistoryCopy? {
        kind == .history ? model.content.community.history : nil
    }

    private var theme: AppTheme { model.theme }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Label("Se publica después de revisión editorial.", systemImage: "checkmark.shield")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(theme.warm)
                    Text(kind == .comment ? model.content.community.comments.formIntro : model.content.community.history.formIntro)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .lineSpacing(2)
                }

                Section("Datos") {
                    TextField(kind == .comment ? model.content.community.comments.namePlaceholder : model.content.community.history.namePlaceholder, text: $displayName)
                        .textInputAutocapitalization(.words)
                    TextField(kind == .comment ? model.content.community.comments.emailPlaceholder : model.content.community.history.emailPlaceholder, text: $email)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    if kind == .history {
                        TextField(model.content.community.history.topicPlaceholder, text: $category)
                    }
                    TextField(kind == .comment ? model.content.community.comments.messagePlaceholder : model.content.community.history.messagePlaceholder, text: $contentText, axis: .vertical)
                        .lineLimit(6, reservesSpace: true)
                }

                if !errorMessage.isEmpty {
                    Section {
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: "exclamationmark.circle.fill")
                                .foregroundStyle(theme.warm)
                                .padding(.top, 1)
                            Text(errorMessage)
                                .font(.footnote)
                                .foregroundStyle(.primary)
                                .lineSpacing(2)
                        }
                    }
                }
            }
            .navigationTitle(kind == .comment ? "Nuevo comentario" : "Nuevo aporte")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSubmitting ? "Enviando…" : "Enviar a revisión") {
                        Task { await submit() }
                    }
                    .disabled(isSubmitting)
                    .tint(theme.warm)
                }
            }
        }
    }

    @MainActor
    private func submit() async {
        let trimmedName = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedContent = contentText.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedCategory = category.trimmingCharacters(in: .whitespacesAndNewlines)

        guard trimmedName.count >= 2 else {
            errorMessage = "Ingresa un nombre o alias válido."
            return
        }
        guard trimmedContent.count >= 12 else {
            errorMessage = "Escribe al menos 12 caracteres."
            return
        }

        isSubmitting = true
        errorMessage = ""
        let succeeded = await onSubmit(
            CommunityPostInput(
                kind: kind,
                displayName: trimmedName,
                email: trimmedEmail,
                category: trimmedCategory.isEmpty ? nil : trimmedCategory,
                content: trimmedContent,
                website: ""
            )
        )
        isSubmitting = false
        if succeeded {
            dismiss()
        }
    }
}
