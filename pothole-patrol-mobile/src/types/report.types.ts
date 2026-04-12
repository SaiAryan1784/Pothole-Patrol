export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ReportStatus = 'PENDING' | 'NEEDS_REVIEW' | 'VERIFIED' | 'REJECTED' | 'REPAIRED';

export interface Report {
    id: string;
    user: string | null;
    latitude: number;
    longitude: number;
    image_url: string;
    severity: Severity;
    description?: string;
    status: ReportStatus;
    confidence: number;
    upvotes: number;
    user_has_upvoted: boolean;
    area_name: string;
    city: string;
    created_at: string;
    updated_at: string;
}
