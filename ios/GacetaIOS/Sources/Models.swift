import Foundation

struct IssueContent: Decodable {
    let id: String
    let metadata: Metadata
    let navigation: [NavigationItem]
    let share: ShareContent
    let cover: CoverSection
    let problem: ProblemSection
    let context: ContextSection
    let impact: ImpactSection
    let data: DataSection
    let routes: RoutesSection
    let action: ActionSection
    let sources: SourcesSection
    let closing: ClosingSection
    let resources: ResourcesSection
    let gallery: GallerySection
    let community: CommunitySection
    let admin: AdminSection
    let contact: ContactSection
}

struct Metadata: Decodable {
    let version: String
    let editionLabel: String
    let location: String
    let publishedDateISO: String
    let publishedDisplay: String
    let siteName: String
    let masthead: String
    let shortMasthead: String
    let canonicalURL: String
    let description: String
    let articleLabel: String
    let topicLabel: String
    let topicValue: String
    let coverThemeLine: String
    let heroImage: HeroImage
    let footerBadges: [String]

    enum CodingKeys: String, CodingKey {
        case version
        case editionLabel
        case location
        case publishedDateISO
        case publishedDisplay
        case siteName
        case masthead
        case shortMasthead
        case canonicalURL = "canonicalUrl"
        case description
        case articleLabel
        case topicLabel
        case topicValue
        case coverThemeLine
        case heroImage
        case footerBadges
    }
}

struct HeroImage: Decodable {
    let src: String
    let alt: String
    let caption: String
}

struct NavigationItem: Decodable, Identifiable {
    let id: String
    let label: String
    let icon: String
}

struct ShareContent: Decodable {
    let title: String
    let summary: String
    let quote: String
    let hashtags: [String]
    let reelGuide: ReelGuide
}

struct ReelGuide: Decodable {
    let title: String
    let shots: [String]
    let cta: String
}

struct CoverSection: Decodable {
    let eyebrow: String
    let title: String
    let titleAccent: String
    let summary: String
    let quickFacts: [QuickFact]
    let leadEditorial: String
    let campaign: CampaignSection
    let damageMap: DamageMap
    let keyFigures: KeyFigures
    let sidebarLabel: String
}

struct QuickFact: Decodable, Identifiable {
    let title: String
    let text: String

    var id: String { title }
}

struct CampaignSection: Decodable {
    let kicker: String
    let title: String
    let badge: String
    let copyQuoteLabel: String
    let copyReelLabel: String
    let openTikTokLabel: String
    let openXLabel: String
}

struct DamageMap: Decodable {
    let title: String
    let subtitle: String
    let metrics: [Metric]
}

struct Metric: Decodable, Identifiable {
    let label: String
    let value: Int
    let note: String

    var id: String { label }
}

struct KeyFigures: Decodable {
    let title: String
    let items: [KeyFigureItem]
}

struct KeyFigureItem: Decodable, Identifiable {
    let label: String
    let value: String

    var id: String { label }
}

struct ProblemSection: Decodable {
    let eyebrow: String
    let title: String
    let summary: String
    let cards: [StoryCardItem]
    let timeline: TimelineSection
}

struct StoryCardItem: Decodable, Identifiable {
    let icon: String
    let title: String
    let text: String

    var id: String { title }
}

struct TimelineSection: Decodable {
    let title: String
    let steps: [TimelineStep]
}

struct TimelineStep: Decodable, Identifiable {
    let step: String
    let desc: String
    let detail: String

    var id: String { step }
}

struct ContextSection: Decodable {
    let eyebrow: String
    let title: String
    let summary: String
    let statCards: [StatCardContent]
    let affectedColonies: AffectedColonies
    let protests: ProtestsSection
}

struct StatCardContent: Decodable, Identifiable {
    let number: String
    let label: String
    let description: String
    let trend: String?

    var id: String { label }
}

struct AffectedColonies: Decodable {
    let title: String
    let items: [AffectedColony]
}

struct AffectedColony: Decodable, Identifiable {
    let name: String
    let district: String
    let desc: String

    var id: String { name }
}

struct ProtestsSection: Decodable {
    let title: String
    let paragraphs: [String]
    let quoteSource: String
    let quote: String
}

struct ImpactSection: Decodable {
    let eyebrow: String
    let title: String
    let summary: String
    let documentedEffectsTitle: String
    let documentedEffectsSubtitle: String
    let effects: [String]
    let clinicalNote: ClinicalNote
}

struct ClinicalNote: Decodable {
    let title: String
    let paragraphs: [String]
    let criticalTitle: String
    let criticalText: String
    let sourceHref: String
    let sourceLabel: String
}

struct DataSection: Decodable {
    let eyebrow: String
    let title: String
    let summary: String
    let legalFrame: LegalFrame
    let noiseLimits: NoiseLimits
}

struct LegalFrame: Decodable {
    let title: String
    let items: [LegalFrameItem]
}

struct LegalFrameItem: Decodable, Identifiable {
    let title: String
    let badge: String
    let text: String
    let sanction: String?

    var id: String { title }
}

struct NoiseLimits: Decodable {
    let title: String
    let grid: [NoiseLimitItem]
    let paragraphs: [String]
    let highlightTitle: String
    let highlightText: String
}

struct NoiseLimitItem: Decodable, Identifiable {
    let value: String
    let label: String
    let detail: String

    var id: String { "\(value)-\(label)" }
}

struct RoutesSection: Decodable {
    let eyebrow: String
    let title: String
    let summary: String
    let authorities: [Authority]
    let evidenceChecklist: EvidenceChecklist
}

struct Authority: Decodable, Identifiable {
    let icon: String
    let label: String
    let title: String
    let text: String
    let href: String
    let meta: String

    var id: String { title }
}

struct EvidenceChecklist: Decodable {
    let title: String
    let items: [String]
}

struct ActionSection: Decodable {
    let eyebrow: String
    let title: String
    let summary: String
    let howToUse: HowToUseSection
    let recommendation: RecommendationSection
    let documentTitle: String
    let copyLabel: String
    let draft: String
}

struct HowToUseSection: Decodable {
    let title: String
    let steps: [String]
}

struct RecommendationSection: Decodable {
    let title: String
    let text: String
}

struct SourcesSection: Decodable {
    let eyebrow: String
    let title: String
    let summary: String
    let items: [SourceReference]
}

struct SourceReference: Decodable, Identifiable {
    let group: String
    let title: String
    let note: String
    let href: String

    var id: String { title }
}

struct ClosingSection: Decodable {
    let title: String
    let subtitle: String
}

struct ResourcesSection: Decodable {
    let eyebrow: String
    let title: String
    let summary: String
    let pdfs: [PDFResource]
}

struct PDFResource: Decodable, Identifiable {
    let id: String
    let title: String
    let description: String
    let fileName: String
    let href: String
}

struct GallerySection: Decodable {
    let eyebrow: String
    let title: String
    let summary: String
    let items: [GalleryAsset]
}

struct GalleryAsset: Decodable, Identifiable {
    let id: String
    let title: String
    let description: String
    let fileName: String
}

struct CommunitySection: Decodable {
    let comments: CommunityCopy
    let history: HistoryCopy
    let admin: CommunityAdminCopy
}

struct CommunityCopy: Decodable {
    let eyebrow: String
    let title: String
    let summary: String
    let formTitle: String
    let formIntro: String
    let socialAuthIntro: String
    let fallbackSocialAuth: String
    let nameLabel: String
    let namePlaceholder: String
    let emailLabel: String
    let emailPlaceholder: String
    let messageLabel: String
    let messagePlaceholder: String
    let submitLabel: String
    let reviewMessage: String
    let feedTitle: String
    let feedEmpty: String
    let refreshLabel: String
    let lastApprovedLabel: String
}

struct HistoryCopy: Decodable {
    let eyebrow: String
    let title: String
    let summary: String
    let formTitle: String
    let formIntro: String
    let nameLabel: String
    let namePlaceholder: String
    let emailLabel: String
    let emailPlaceholder: String
    let topicLabel: String
    let topicPlaceholder: String
    let messageLabel: String
    let messagePlaceholder: String
    let submitLabel: String
    let reviewMessage: String
    let allFilterLabel: String
    let empty: String
}

struct CommunityAdminCopy: Decodable {
    let title: String
    let pendingTitle: String
    let approvedTitle: String
    let emptyPending: String
    let approveLabel: String
    let rejectLabel: String
    let hideLabel: String
}

struct AdminSection: Decodable {
    let eyebrow: String
    let title: String
    let summary: String
    let tokenLabel: String
    let tokenPlaceholder: String
    let tokenHelp: String
    let unlockLabel: String
    let titleFieldLabel: String
    let titlePlaceholder: String
    let periodLabel: String
    let periodDailyLabel: String
    let periodWeeklyLabel: String
    let periodStartLabel: String
    let notesLabel: String
    let notesPlaceholder: String
    let createLabel: String
    let refreshLabel: String
    let logoutLabel: String
    let emptyEditions: String
    let operationalHint: String
}

struct ContactSection: Decodable {
    let eyebrow: String
    let title: String
    let summary: String
    let email: String
    let mailSubject: String
    let mailLabel: String
    let tiktok: String
    let tiktokURL: String
    let tiktokLabel: String
    let site: String
    let siteLabel: String

    enum CodingKeys: String, CodingKey {
        case eyebrow
        case title
        case summary
        case email
        case mailSubject
        case mailLabel
        case tiktok
        case tiktokURL = "tiktokUrl"
        case tiktokLabel
        case site
        case siteLabel
    }
}

enum CommunityKind: String, CaseIterable, Codable, Identifiable {
    case comment
    case history

    var id: String { rawValue }
}

enum CommunityModerationStatus: String, Codable {
    case pending
    case approved
    case rejected
    case hidden
}

struct CommunityPost: Decodable, Identifiable {
    let id: String
    let kind: CommunityKind
    let displayName: String
    let email: String
    let category: String?
    let content: String
    let approved: Bool
    let source: String
    let moderationStatus: CommunityModerationStatus?
    let createdAt: String
}

struct CommunityPostInput: Encodable {
    let kind: CommunityKind
    let displayName: String
    let email: String
    let category: String?
    let content: String
    let website: String
}

struct AdminEdition: Decodable, Identifiable {
    let id: String
    let title: String
    let periodType: String
    let periodStart: String
    let periodEnd: String
    let status: String
    let notes: String
    let createdAt: String
}

struct CreateEditionInput: Encodable {
    let title: String
    let periodType: String
    let periodStart: String
    let periodEnd: String
    let notes: String
}

enum CommunityModerationAction: String, Encodable {
    case approve
    case reject
    case hide
}

struct AdminCommunityItem: Decodable, Identifiable {
    let id: String
    let kind: CommunityKind
    let displayName: String
    let email: String
    let category: String?
    let content: String
    let approved: Bool
    let source: String
    let moderationStatus: CommunityModerationStatus
    let createdAt: String
}

struct ItemsEnvelope<Item: Decodable>: Decodable {
    let items: [Item]
}

struct ItemEnvelope<Item: Decodable>: Decodable {
    let item: Item
}
