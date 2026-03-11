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

            NavigationStack {
                LibraryView(isShowingSettings: $isShowingSettings)
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
    }
}
