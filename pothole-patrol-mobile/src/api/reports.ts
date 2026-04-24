import axiosClient from './axiosClient';

export type SubmitReportPayload = {
    imageUri: string;
    latitude: number;
    longitude: number;
    description?: string;
};

/**
 * Submit a report to the backend. Returns the axios response so callers can
 * inspect both 201 (new report created) and 200 (50m-dedup hit) shapes.
 *
 * Used by both the report form and the offline queue sync hook — keeping
 * it in one place ensures the sync path is indistinguishable from a normal
 * online submit.
 */
export const submitReport = async (payload: SubmitReportPayload) => {
    const { imageUri, latitude, longitude, description } = payload;
    const filename = imageUri.split('/').pop() || `pothole_${Date.now()}.jpg`;

    const formData = new FormData();
    formData.append(
        'image',
        { uri: imageUri, name: filename, type: 'image/jpeg' } as unknown as Blob,
    );
    formData.append('latitude', String(latitude));
    formData.append('longitude', String(longitude));
    if (description) formData.append('description', description);

    return axiosClient.post('/reports/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};
