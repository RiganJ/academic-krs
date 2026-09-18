<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateEnrollmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'academic_year' => [
                'required',
                'regex:/^[0-9]{4}\/[0-9]{4}$/',
            ],

            'semester' => [
                'required',
                'in:GANJIL,GENAP',
            ],

            'status' => [
                'required',
                'in:DRAFT,SUBMITTED,APPROVED,REJECTED',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'academic_year.required' =>
                'Tahun ajaran wajib diisi.',

            'academic_year.regex' =>
                'Tahun ajaran harus menggunakan format YYYY/YYYY.',

            'semester.required' =>
                'Semester wajib dipilih.',

            'semester.in' =>
                'Semester harus GANJIL atau GENAP.',

            'status.required' =>
                'Status wajib dipilih.',

            'status.in' =>
                'Status harus DRAFT, SUBMITTED, APPROVED, atau REJECTED.',
        ];
    }
}