import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @EnvironmentObject private var model: AppModel

    @AppStorage("ios.admin.token") private var adminToken = ""
    @State private var isShowingUnlock = false
    @State private var tokenDraft = ""

    private var content: IssueContent { model.content }
    private var theme: AppTheme { model.theme }

    var body: some View {
        List {
            Section("Soporte") {
                Button(content.contact.mailLabel) {
                    if let url = URL(string: "mailto:\(content.contact.email)?subject=\(content.contact.mailSubject.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") {
                        openURL(url)
                    }
                }
                Button(content.contact.tiktokLabel) {
                    if let url = URL(string: content.contact.tiktokURL) {
                        openURL(url)
                    }
                }
                Button(content.contact.siteLabel) {
                    if let url = URL(string: content.contact.site) {
                        openURL(url)
                    }
                }
            }

            Section("Acerca de") {
                VStack(alignment: .leading, spacing: 8) {
                    Text(content.metadata.masthead)
                        .font(.headline)
                    Text(content.metadata.description)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text("Versión \(content.metadata.version) · \(content.metadata.publishedDisplay)")
                        .font(.footnote)
                        .foregroundStyle(theme.warm)
                        .onLongPressGesture(minimumDuration: 1.1) {
                            tokenDraft = adminToken
                            isShowingUnlock = true
                        }
                }
                if !adminToken.isEmpty {
                    NavigationLink("Admin editorial") {
                        AdminView()
                            .environmentObject(model)
                    }
                }
            }
        }
        .navigationTitle("Soporte y ajustes")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Cerrar") { dismiss() }
            }
        }
        .sheet(isPresented: $isShowingUnlock) {
            NavigationStack {
                Form {
                    Section {
                        SecureField(content.admin.tokenPlaceholder, text: $tokenDraft)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        Text(content.admin.tokenHelp)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    } header: {
                        Text(content.admin.tokenLabel)
                    }
                }
                .navigationTitle("Desbloquear admin")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancelar") { isShowingUnlock = false }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button(content.admin.unlockLabel) {
                            adminToken = tokenDraft.trimmingCharacters(in: .whitespacesAndNewlines)
                            isShowingUnlock = false
                        }
                        .disabled(tokenDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }
                }
            }
        }
    }
}
