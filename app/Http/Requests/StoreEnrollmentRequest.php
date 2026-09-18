<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEnrollmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'student.nim' => [
                'required',
                'regex:/^[0-9]{8,12}$/',
                Rule::unique('students', 'nim'),
            ],

            'student.name' => [
                'required',
                'string',
                'min:3',
                'max:100',
            ],

            'student.email' => [
                'required',
                'email',
                Rule::unique('students', 'email'),
            ],

            'course.code' => [
                'required',
                'regex:/^[A-Z]{2,4}[0-9]{3}$/',
                Rule::unique('courses', 'code'),
            ],

            'course.name' => [
                'required',
                'string',
                'min:3',
                'max:120',
            ],

            'course.credits' => [
                'required',
                'integer',
                'between:1,6',
            ],

            'enrollment.academic_year' => [
                'required',
                'regex:/^[0-9]{4}\/[0-9]{4}$/',
            ],

            'enrollment.semester' => [
                'required',
                'in:GANJIL,GENAP',
            ],

            'enrollment.status' => [
                'required',
                'in:DRAFT,SUBMITTED,APPROVED,REJECTED',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'student.nim.required' => 'NIM wajib diisi.',
            'student.nim.regex' => 'NIM harus terdiri dari 8 sampai 12 digit angka.',

            'student.name.required' => 'Nama mahasiswa wajib diisi.',
            'student.name.min' => 'Nama mahasiswa minimal 3 karakter.',
            'student.name.max' => 'Nama mahasiswa maksimal 100 karakter.',

            'student.email.required' => 'Email mahasiswa wajib diisi.',
            'student.email.email' => 'Format email mahasiswa tidak valid.',

            'course.code.required' => 'Kode mata kuliah wajib diisi.',
            'course.code.regex' => 'Kode mata kuliah harus mengikuti format seperti IF101.',

            'course.name.required' => 'Nama mata kuliah wajib diisi.',
            'course.name.min' => 'Nama mata kuliah minimal 3 karakter.',
            'course.name.max' => 'Nama mata kuliah maksimal 120 karakter.',

            'course.credits.required' => 'Jumlah SKS wajib diisi.',
            'course.credits.integer' => 'Jumlah SKS harus berupa angka.',
            'course.credits.between' => 'Jumlah SKS harus antara 1 sampai 6.',

            'enrollment.academic_year.required' => 'Tahun ajaran wajib diisi.',
            'enrollment.academic_year.regex' => 'Tahun ajaran harus menggunakan format YYYY/YYYY.',

            'enrollment.semester.required' => 'Semester wajib dipilih.',
            'enrollment.semester.in' => 'Semester harus GANJIL atau GENAP.',

            'enrollment.status.required' => 'Status wajib dipilih.',
            'enrollment.status.in' => 'Status harus DRAFT, SUBMITTED, APPROVED, atau REJECTED.',
        ];
    }
}