import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFloppyDisk,
    faXmark,
} from '@fortawesome/free-solid-svg-icons';

const initialCreateForm = {
    student: {
        nim: '',
        name: '',
        email: '',
    },
    course: {
        code: '',
        name: '',
        credits: 3,
    },
    enrollment: {
        academic_year: '2026/2027',
        semester: 'GANJIL',
        status: 'DRAFT',
    },
};

function EnrollmentForm({
    open,
    mode = 'create',
    selectedData = null,
    onClose,
    onSubmit,
}) {
    const [form, setForm] = useState(initialCreateForm);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!open) return;

        if (mode === 'edit' && selectedData) {
            setForm({
                academic_year: selectedData.academic_year,
                semester: selectedData.semester,
                status: selectedData.status,
            });
        } else {
            setForm(initialCreateForm);
        }

        setErrors({});
    }, [open, mode, selectedData]);

    if (!open) return null;

    function setNested(section, field, value) {
        setForm((prev) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value,
            },
        }));
    }

    function validateCreate() {
        const newErrors = {};

        if (!/^[0-9]{8,12}$/.test(form.student.nim)) {
            newErrors['student.nim'] =
                'NIM harus terdiri dari 8–12 digit angka.';
        }

        if (
            form.student.name.trim().length < 3 ||
            form.student.name.trim().length > 100
        ) {
            newErrors['student.name'] =
                'Nama mahasiswa harus 3–100 karakter.';
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                form.student.email
            )
        ) {
            newErrors['student.email'] =
                'Format email tidak valid.';
        }

        if (
            !/^[A-Z]{2,4}[0-9]{3}$/.test(
                form.course.code
            )
        ) {
            newErrors['course.code'] =
                'Format kode MK harus seperti IF101.';
        }

        if (
            form.course.name.trim().length < 3 ||
            form.course.name.trim().length > 120
        ) {
            newErrors['course.name'] =
                'Nama mata kuliah harus 3–120 karakter.';
        }

        const credits = Number(form.course.credits);

        if (
            !Number.isInteger(credits) ||
            credits < 1 ||
            credits > 6
        ) {
            newErrors['course.credits'] =
                'SKS harus integer 1–6.';
        }

        if (
            !/^[0-9]{4}\/[0-9]{4}$/.test(
                form.enrollment.academic_year
            )
        ) {
            newErrors['enrollment.academic_year'] =
                'Format tahun ajaran harus YYYY/YYYY.';
        }

        if (!['GANJIL', 'GENAP'].includes(form.enrollment.semester)) {
            newErrors['enrollment.semester'] =
                'Semester harus GANJIL atau GENAP.';
        }

        if (!['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].includes(
            form.enrollment.status
        )) {
            newErrors['enrollment.status'] =
                'Status enrollment tidak valid.';
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    }

    function validateEdit() {
        const newErrors = {};

        if (
            !/^[0-9]{4}\/[0-9]{4}$/.test(
                form.academic_year
            )
        ) {
            newErrors.academic_year =
                'Format tahun ajaran harus YYYY/YYYY.';
        }

        if (!['GANJIL', 'GENAP'].includes(form.semester)) {
            newErrors.semester = 'Semester harus GANJIL atau GENAP.';
        }

        if (!['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].includes(
            form.status
        )) {
            newErrors.status = 'Status enrollment tidak valid.';
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    }

    function handleSubmit(e) {
        e.preventDefault();

        const valid =
            mode === 'create'
                ? validateCreate()
                : validateEdit();

        if (!valid) return;

        onSubmit(form);
    }

    return (
        <div
            className="krs-modal-overlay"
            role="presentation"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className="krs-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="enrollment-form-title"
            >

                <div className="krs-modal-header">
                    <div>
                        <span className="krs-modal-eyebrow">
                            {mode === 'create'
                                ? 'NEW ENROLLMENT'
                                : 'UPDATE ENROLLMENT'}
                        </span>

                        <h2 id="enrollment-form-title">
                            {mode === 'create'
                                ? 'Create KRS'
                                : 'Edit KRS'}
                        </h2>

                        <p>
                            {mode === 'create'
                                ? 'Tambahkan mahasiswa, mata kuliah, dan data pengambilan KRS.'
                                : 'Perbarui informasi enrollment mahasiswa.'}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="krs-modal-close"
                        onClick={onClose}
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="krs-modal-body">

                        {mode === 'create' && (
                            <>
                                <section className="form-section">
                                    <div className="section-heading">
                                        <div className="section-number">01</div>

                                        <div>
                                            <h3>Data Mahasiswa</h3>
                                            <p>
                                                Informasi identitas mahasiswa
                                            </p>
                                        </div>
                                    </div>

                                    <div className="krs-form-grid">
                                        <div className="form-group">
                                            <label>
                                                NIM
                                                <span>*</span>
                                            </label>

                                            <input
                                                type="text"
                                                placeholder="Contoh: 21234567"
                                                value={form.student.nim}
                                                onChange={(e) =>
                                                    setNested(
                                                        'student',
                                                        'nim',
                                                        e.target.value
                                                    )
                                                }
                                            />

                                            {errors['student.nim'] && (
                                                <div className="field-error">
                                                    {errors['student.nim']}
                                                </div>
                                            )}
                                        </div>

                                        <div className="form-group">
                                            <label>
                                                Nama Mahasiswa
                                                <span>*</span>
                                            </label>

                                            <input
                                                type="text"
                                                placeholder="Nama lengkap mahasiswa"
                                                value={form.student.name}
                                                onChange={(e) =>
                                                    setNested(
                                                        'student',
                                                        'name',
                                                        e.target.value
                                                    )
                                                }
                                            />

                                            {errors['student.name'] && (
                                                <div className="field-error">
                                                    {errors['student.name']}
                                                </div>
                                            )}
                                        </div>

                                        <div className="form-group full-width">
                                            <label>
                                                Email
                                                <span>*</span>
                                            </label>

                                            <input
                                                type="email"
                                                placeholder="nama@email.com"
                                                value={form.student.email}
                                                onChange={(e) =>
                                                    setNested(
                                                        'student',
                                                        'email',
                                                        e.target.value
                                                    )
                                                }
                                            />

                                            {errors['student.email'] && (
                                                <div className="field-error">
                                                    {errors['student.email']}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                <section className="form-section">
                                    <div className="section-heading">
                                        <div className="section-number">02</div>

                                        <div>
                                            <h3>Data Mata Kuliah</h3>
                                            <p>
                                                Informasi mata kuliah yang diambil
                                            </p>
                                        </div>
                                    </div>

                                    <div className="krs-form-grid">
                                        <div className="form-group">
                                            <label>
                                                Kode MK
                                                <span>*</span>
                                            </label>

                                            <input
                                                type="text"
                                                placeholder="Contoh: IF101"
                                                value={form.course.code}
                                                onChange={(e) =>
                                                    setNested(
                                                        'course',
                                                        'code',
                                                        e.target.value.toUpperCase()
                                                    )
                                                }
                                            />

                                            {errors['course.code'] && (
                                                <div className="field-error">
                                                    {errors['course.code']}
                                                </div>
                                            )}
                                        </div>

                                        <div className="form-group">
                                            <label>
                                                SKS
                                                <span>*</span>
                                            </label>

                                            <input
                                                type="number"
                                                min="1"
                                                max="6"
                                                value={form.course.credits}
                                                onChange={(e) =>
                                                    setNested(
                                                        'course',
                                                        'credits',
                                                        e.target.value
                                                    )
                                                }
                                            />

                                            {errors['course.credits'] && (
                                                <div className="field-error">
                                                    {errors['course.credits']}
                                                </div>
                                            )}
                                        </div>

                                        <div className="form-group full-width">
                                            <label>
                                                Nama Mata Kuliah
                                                <span>*</span>
                                            </label>

                                            <input
                                                type="text"
                                                placeholder="Nama mata kuliah"
                                                value={form.course.name}
                                                onChange={(e) =>
                                                    setNested(
                                                        'course',
                                                        'name',
                                                        e.target.value
                                                    )
                                                }
                                            />

                                            {errors['course.name'] && (
                                                <div className="field-error">
                                                    {errors['course.name']}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            </>
                        )}

                        <section className="form-section">
                            <div className="section-heading">
                                <div className="section-number">
                                    {mode === 'create' ? '03' : '01'}
                                </div>

                                <div>
                                    <h3>Data Enrollment</h3>
                                    <p>
                                        Tahun ajaran, semester, dan status KRS
                                    </p>
                                </div>
                            </div>

                            <div className="krs-form-grid">
                                <div className="form-group">
                                    <label>
                                        Tahun Ajaran
                                        <span>*</span>
                                    </label>

                                    <input
                                        type="text"
                                        placeholder="2026/2027"
                                        value={
                                            mode === 'create'
                                                ? form.enrollment.academic_year
                                                : form.academic_year
                                        }
                                        onChange={(e) => {
                                            if (mode === 'create') {
                                                setNested(
                                                    'enrollment',
                                                    'academic_year',
                                                    e.target.value
                                                );
                                            } else {
                                                setForm({
                                                    ...form,
                                                    academic_year:
                                                        e.target.value,
                                                });
                                            }
                                        }}
                                    />

                                    {errors[
                                        mode === 'create'
                                            ? 'enrollment.academic_year'
                                            : 'academic_year'
                                    ] && (
                                        <div className="field-error">
                                            {
                                                errors[
                                                    mode === 'create'
                                                        ? 'enrollment.academic_year'
                                                        : 'academic_year'
                                                ]
                                            }
                                        </div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>
                                        Semester
                                        <span>*</span>
                                    </label>

                                    <select
                                        value={
                                            mode === 'create'
                                                ? form.enrollment.semester
                                                : form.semester
                                        }
                                        onChange={(e) => {
                                            if (mode === 'create') {
                                                setNested(
                                                    'enrollment',
                                                    'semester',
                                                    e.target.value
                                                );
                                            } else {
                                                setForm({
                                                    ...form,
                                                    semester:
                                                        e.target.value,
                                                });
                                            }
                                        }}
                                    >
                                        <option value="GANJIL">
                                            GANJIL
                                        </option>

                                        <option value="GENAP">
                                            GENAP
                                        </option>
                                    </select>
                                </div>

                                <div className="form-group full-width">
                                    <label>
                                        Status KRS
                                        <span>*</span>
                                    </label>

                                    <select
                                        value={
                                            mode === 'create'
                                                ? form.enrollment.status
                                                : form.status
                                        }
                                        onChange={(e) => {
                                            if (mode === 'create') {
                                                setNested(
                                                    'enrollment',
                                                    'status',
                                                    e.target.value
                                                );
                                            } else {
                                                setForm({
                                                    ...form,
                                                    status:
                                                        e.target.value,
                                                });
                                            }
                                        }}
                                    >
                                        <option value="DRAFT">
                                            DRAFT
                                        </option>

                                        <option value="SUBMITTED">
                                            SUBMITTED
                                        </option>

                                        <option value="APPROVED">
                                            APPROVED
                                        </option>

                                        <option value="REJECTED">
                                            REJECTED
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="krs-modal-footer">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={onClose}
                        >
                            <FontAwesomeIcon icon={faXmark} />
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="btn-submit"
                        >
                            <FontAwesomeIcon icon={faFloppyDisk} />
                            {mode === 'create'
                                ? 'Create KRS'
                                : 'Save Changes'}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}

export default EnrollmentForm;