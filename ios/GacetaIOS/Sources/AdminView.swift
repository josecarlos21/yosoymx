import SwiftUI

struct AdminView: View {
    @EnvironmentObject private var model: AppModel
    @AppStorage("ios.admin.token") private var adminToken = ""

    @State private var editions: [AdminEdition] = []
    @State private var pendingPosts: [AdminCommunityItem] = []
    @State private var approvedPosts: [AdminCommunityItem] = []
    @State private var title = ""
    @State private var periodType = "daily"
    @State private var periodStart = Date()
    @State private var notes = ""
    @State private var isLoading = false
    @State private var errorMessage = ""
    @State private var statusMessage = ""

    private var content: IssueContent { model.content }
    private var theme: AppTheme { model.theme }

    var body: some View {
        List {
            if !adminToken.isEmpty {
                Section(content.admin.title) {
                    TextField(content.admin.titlePlaceholder, text: $title)
                    Picker(content.admin.periodLabel, selection: $periodType) {
                        Text(content.admin.periodDailyLabel).tag("daily")
                        Text(content.admin.periodWeeklyLabel).tag("weekly")
                    }
                    DatePicker(content.admin.periodStartLabel, selection: $periodStart, displayedComponents: .date)
                    TextField(content.admin.notesPlaceholder, text: $notes, axis: .vertical)
                        .lineLimit(4, reservesSpace: true)
                    Button(isLoading ? "Guardando…" : content.admin.createLabel) {
                        Task { await createEdition() }
                    }
                    .tint(theme.warm)
                    .disabled(isLoading)
                }

                Section(content.community.admin.pendingTitle) {
                    if pendingPosts.isEmpty {
                        Text(content.community.admin.emptyPending)
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(pendingPosts) { item in
                            moderationCard(item)
                        }
                    }
                }

                Section(content.community.admin.approvedTitle) {
                    if approvedPosts.isEmpty {
                        Text("No hay aportes aprobados todavía.")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(approvedPosts) { item in
                            VStack(alignment: .leading, spacing: 6) {
                                Text(item.displayName)
                                    .font(.headline)
                                if let category = item.category {
                                    Text(category.uppercased())
                                        .font(.caption.weight(.bold))
                                        .foregroundStyle(theme.warm)
                                }
                                Text(item.content)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                Button(content.community.admin.hideLabel) {
                                    Task { await moderate(item, action: .hide) }
                                }
                                .buttonStyle(.bordered)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }

                Section("Ediciones recientes") {
                    if editions.isEmpty {
                        Text(content.admin.emptyEditions)
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(editions) { edition in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(edition.title)
                                    .font(.headline)
                                Text("\(edition.periodStart) → \(edition.periodEnd)")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                if !edition.notes.isEmpty {
                                    Text(edition.notes)
                                        .font(.footnote)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
            } else {
                Section {
                    Text("Admin no configurado. Mantén presionada la versión en Ajustes para revelar el acceso.")
                }
            }

            if !statusMessage.isEmpty {
                Section {
                    Text(statusMessage)
                        .foregroundStyle(theme.warm)
                }
            }

            if !errorMessage.isEmpty {
                Section {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                }
            }
        }
        .navigationTitle("Admin editorial")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button {
                    Task { await refresh() }
                } label: {
                    Label(content.admin.refreshLabel, systemImage: "arrow.clockwise")
                }
                Button(content.admin.logoutLabel) {
                    adminToken = ""
                    editions = []
                    pendingPosts = []
                    approvedPosts = []
                }
            }
        }
        .task {
            await refresh()
        }
    }

    @ViewBuilder
    private func moderationCard(_ item: AdminCommunityItem) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.displayName)
                        .font(.headline)
                    Text(item.kind == .comment ? "Comentario" : "Historial")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(theme.warm)
                }
                Spacer()
                Text(item.createdAt)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            if let category = item.category {
                Text(category)
                    .font(.caption)
                    .foregroundStyle(theme.warm)
            }
            Text(item.content)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack {
                Button(content.community.admin.approveLabel) {
                    Task { await moderate(item, action: .approve) }
                }
                .buttonStyle(.borderedProminent)
                .tint(theme.warm)

                Button(content.community.admin.rejectLabel) {
                    Task { await moderate(item, action: .reject) }
                }
                .buttonStyle(.bordered)

                Button(content.community.admin.hideLabel) {
                    Task { await moderate(item, action: .hide) }
                }
                .buttonStyle(.bordered)
            }
        }
        .padding(.vertical, 4)
    }

    @MainActor
    private func refresh() async {
        guard !adminToken.isEmpty else { return }
        isLoading = true
        errorMessage = ""
        do {
            async let remoteEditions = model.apiClient.fetchAdminEditions(token: adminToken)
            async let remotePending = model.apiClient.fetchAdminCommunity(token: adminToken, status: .pending)
            async let remoteApproved = model.apiClient.fetchAdminCommunity(token: adminToken, status: .approved)
            editions = try await remoteEditions
            pendingPosts = try await remotePending
            approvedPosts = try await remoteApproved
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    @MainActor
    private func createEdition() async {
        guard !adminToken.isEmpty else { return }
        isLoading = true
        errorMessage = ""
        do {
            let start = ISO8601DateFormatter().string(from: Calendar.current.startOfDay(for: periodStart))
            let endOffset = periodType == "daily" ? 1 : 6
            let endDate = Calendar.current.date(byAdding: .day, value: endOffset, to: Calendar.current.startOfDay(for: periodStart)) ?? periodStart
            let end = ISO8601DateFormatter().string(from: endDate)
            let edition = try await model.apiClient.createEdition(
                token: adminToken,
                input: CreateEditionInput(
                    title: title.isEmpty ? "\(content.admin.periodDailyLabel) \(start.prefix(10))" : title,
                    periodType: periodType,
                    periodStart: start,
                    periodEnd: end,
                    notes: notes.isEmpty ? content.admin.operationalHint : notes
                )
            )
            editions.insert(edition, at: 0)
            statusMessage = "Edición creada."
            title = ""
            notes = ""
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    @MainActor
    private func moderate(_ item: AdminCommunityItem, action: CommunityModerationAction) async {
        guard !adminToken.isEmpty else { return }
        do {
            let updated = try await model.apiClient.moderateCommunity(token: adminToken, id: item.id, action: action)
            pendingPosts.removeAll { $0.id == item.id }
            approvedPosts.removeAll { $0.id == item.id }
            if updated.moderationStatus == .approved {
                approvedPosts.insert(updated, at: 0)
            }
            statusMessage = "Moderación actualizada."
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
