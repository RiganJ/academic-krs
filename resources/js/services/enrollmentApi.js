import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        Accept: 'application/json',
    },
});

export async function getEnrollments(params = {}) {
    const response = await api.get('/enrollments', {
        params,
    });

    return response.data;
}

export async function createEnrollment(payload) {
    const response = await api.post('/enrollments', payload);
    return response.data;
}

export async function updateEnrollment(id, payload) {
    const response = await api.put(`/enrollments/${id}`, payload);
    return response.data;
}

export async function deleteEnrollment(id) {
    const response = await api.delete(`/enrollments/${id}`);
    return response.data;
}

export function exportEnrollments(params = {}) {
    const query = new URLSearchParams(params).toString();

    window.location.href =
        `/api/enrollments/export${query ? `?${query}` : ''}`;
}