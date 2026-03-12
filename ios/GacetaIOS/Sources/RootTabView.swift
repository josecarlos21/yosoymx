import SwiftUI

enum RootTab: Hashable {
    case start
    case route
    case library
    case community
}

struct RootTabView: View {
    @EnvironmentObject private var model: AppModel
    @State private var isShowingSettings = false
    @State private var selectedTab: RootTab = .start
    @State private var libraryPath: [LibraryDestination] = []

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                StartView(selectedTab: $selectedTab, isShowingSettings: $isShowingSettings)
            }
            .tag(RootTab.start)
            .tabItem {
                Label("Inicio", systemImage: "newspaper.fill")
            }

            NavigationStack {
                RouteView(isShowingSettings: $isShowingSettings)
            }
            .tag(RootTab.route)
            .tabItem {
                Label("Ruta", systemImage: "point.3.connected.trianglepath.dotted")
            }

            NavigationStack(path: $libraryPath) {
                LibraryView(isShowingSettings: $isShowingSettings)
            }
            .navigationDestination(for: LibraryDestination.self) { destination in
                switch destination {
                case .document(let resourceID):
                    if let resource = model.content.resources.pdfs.first(where: { $0.id == resourceID }) {
                        DocumentDetailView(resource: resource)
                            .environmentObject(model)
                    } else {
                        ContentUnavailableView("Recurso no disponible", systemImage: "doc.badge.questionmark", description: Text("No encontramos ese documento en la edición actual."))
                    }
                }
            }
            .tag(RootTab.library)
            .tabItem {
                Label("Biblioteca", systemImage: "books.vertical.fill")
            }

            NavigationStack {
                CommunityView(isShowingSettings: $isShowingSettings)
            }
            .tag(RootTab.community)
            .tabItem {
                Label("Comunidad", systemImage: "person.3.fill")
            }
        }
        .tint(model.theme.warm)
        .toolbarBackground(.visible, for: .tabBar)
        .toolbarBackground(.ultraThinMaterial, for: .tabBar)
        .sheet(isPresented: $isShowingSettings) {
            NavigationStack {
                SettingsView()
                    .environmentObject(model)
            }
            .presentationDetents([.large])
        }
        .task(id: model.config.screenshotRoute?.absoluteString) {
            guard let screenshotRoute = model.config.screenshotRoute else { return }
            handleIncomingURL(screenshotRoute)
        }
        .onOpenURL(perform: handleIncomingURL)
        .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { userActivity in
            guard let url = userActivity.webpageURL else { return }
            handleIncomingURL(url)
        }
    }

    private func handleIncomingURL(_ url: URL) {
        guard let destination = AppDeepLinkParser.parse(url: url, content: model.content) else { return }

        switch destination {
        case .start:
            isShowingSettings = false
            selectedTab = .start
        case .route:
            isShowingSettings = false
            selectedTab = .route
        case .library:
            isShowingSettings = false
            libraryPath = []
            selectedTab = .library
        case .community:
            isShowingSettings = false
            selectedTab = .community
        case .contact:
            libraryPath = []
            selectedTab = .start
            isShowingSettings = true
        case .edition(let slug):
            isShowingSettings = false
            libraryPath = []
            selectedTab = .start
            Task {
                await model.loadEdition(slug: slug)
            }
        case .resource(let resourceID):
            isShowingSettings = false
            selectedTab = .library
            libraryPath = [.document(resourceID)]
        }
    }
}
