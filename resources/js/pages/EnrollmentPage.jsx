import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faDownload,
    faEye,
    faFilter,
    faPenToSquare,
    faPlus,
    faRotate,
    faSearch,
    faTrash,
    faCirclePlus,
    faCheck,
    faXmark,
} from '@fortawesome/free-solid-svg-icons';
import EnrollmentForm from '../components/EnrollmentForm';

function EnrollmentPage() {
    /*
    |--------------------------------------------------------------------------
    | Form State
    |--------------------------------------------------------------------------
    */

    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState('create');
    const [selectedRow, setSelectedRow] = useState(null);
    const [detailRow, setDetailRow] = useState(null);

    /*
    |--------------------------------------------------------------------------
    | Table State
    |--------------------------------------------------------------------------
    */

    const [rows, setRows] = useState([]);

    const [meta, setMeta] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 25,
    });

    const [loading, setLoading] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | Filter State
    |--------------------------------------------------------------------------
    */

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [semester, setSemester] = useState('');

    /*
    |--------------------------------------------------------------------------
    | Sort State
    |--------------------------------------------------------------------------
    */

    const [sortBy, setSortBy] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc');

    const [advancedOpen, setAdvancedOpen] = useState(false);

    const [filterLogic, setFilterLogic] = useState('AND');

    const [advancedFilters, setAdvancedFilters] = useState([
        {
            field: 'student_nim',
            operator: 'contains',
            value: '',
        },
    ]);

    const [multiSorts, setMultiSorts] = useState([
        {
            field: 'academic_year',
            direction: 'desc',
        },
    ]);

    function normalizeFilterValue(filter) {
        if (
            ['in', 'between'].includes(filter.operator)
            && typeof filter.value === 'string'
        ) {
            return {
                ...filter,
                value: filter.value
                    .split(',')
                    .map((value) => value.trim())
                    .filter(Boolean),
            };
        }

        return filter;
    }

    const [groupLogic, setGroupLogic] = useState('AND');

    const [filterGroups, setFilterGroups] = useState([
        {
            name: 'Group A',
            logic: 'AND',
            filters: [
                {
                    field: 'academic_year',
                    operator: 'equal',
                    value: '',
                },
            ],
        },
        {
            name: 'Group B',
            logic: 'AND',
            filters: [
                {
                    field: 'status',
                    operator: 'equal',
                    value: '',
                },
            ],
        },
    ]);

    /*
    |--------------------------------------------------------------------------
    | Fetch Data
    |--------------------------------------------------------------------------
    */

    async function fetchData(page = 1) {
        try {
            setLoading(true);

            const activeAdvancedFilters =
                advancedFilters.filter(
                    (filter) =>
                        String(filter.value ?? '').trim() !== ''
                );

            const activeFilterGroups =
                filterGroups
                    .map((group) => ({
                        logic: group.logic,
                        filters: group.filters.filter(
                            (filter) =>
                                String(
                                    filter.value ?? ''
                                ).trim() !== ''
                        ),
                    }))
                    .filter(
                        (group) =>
                            group.filters.length > 0
                    );

            const params = {
                page,
                page_size: 25,

                search:
                    search.trim() !== ''
                        ? search.trim()
                        : undefined,

                status:
                    status !== ''
                        ? status
                        : undefined,

                semester:
                    semester !== ''
                        ? semester
                        : undefined,

                sort_by: sortBy,
                sort_direction: sortDirection,

                filters:
                    activeAdvancedFilters.length > 0
                        ? JSON.stringify(
                            activeAdvancedFilters.map(
                                normalizeFilterValue
                            )
                        )
                        : undefined,

                filter_logic:
                    activeAdvancedFilters.length > 0
                        ? filterLogic
                        : undefined,

                filter_groups:
                    activeFilterGroups.length > 0
                        ? JSON.stringify(
                            activeFilterGroups.map((group) => ({
                                ...group,
                                filters: group.filters.map(
                                    normalizeFilterValue
                                ),
                            }))
                        )
                        : undefined,

                group_logic:
                    activeFilterGroups.length > 0
                        ? groupLogic
                        : undefined,

                sorts:
                    multiSorts.length > 0
                        ? JSON.stringify(
                            multiSorts
                        )
                        : undefined,
            };

            console.log(
                'REQUEST PARAMS:',
                params
            );

            const response = await axios.get(
                '/api/enrollments',
                {
                    params,
                    timeout: 20000,

                    headers: {
                        Accept: 'application/json',
                    },
                }
            );

            setRows(response.data.data);
            setMeta(response.data.meta);

        } catch (error) {
            console.error(error);

            const message =
                error.code === 'ECONNABORTED'
                    ? 'Server terlalu lama merespons. Periksa koneksi database atau index query.'
                    : error.response?.data?.message
                        ?? 'Tidak dapat mengambil data KRS.';

            Swal.fire({
                icon: 'error',
                title: 'Gagal mengambil data',
                text: message,
            });

        } finally {
            setLoading(false);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Live Search Debounce
    |--------------------------------------------------------------------------
    |
    | Requirement PDF meminta debounce 300–500 ms.
    | Kita gunakan 400 ms.
    */

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData(1);
        }, 400);

        return () => clearTimeout(timer);

    }, [
        search,
        status,
        semester,
        sortBy,
        sortDirection,
        advancedFilters,
        filterLogic,
        filterGroups,
        groupLogic,
        multiSorts,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Sorting
    |--------------------------------------------------------------------------
    */

    function handleSort(field) {
        if (sortBy === field) {
            setSortDirection(
                sortDirection === 'asc'
                    ? 'desc'
                    : 'asc'
            );

            return;
        }

        setSortBy(field);
        setSortDirection('asc');
    }

    function sortIndicator(field) {
        if (sortBy !== field) {
            return '↕';
        }

        return sortDirection === 'asc'
            ? '↑'
            : '↓';
    }

    /*
    |--------------------------------------------------------------------------
    | Open Create Modal
    |--------------------------------------------------------------------------
    */

    function openCreate() {
        setFormMode('create');
        setSelectedRow(null);
        setFormOpen(true);
    }

    /*
    |--------------------------------------------------------------------------
    | Open Edit Modal
    |--------------------------------------------------------------------------
    */

    function openEdit(row) {
        setFormMode('edit');
        setSelectedRow(row);
        setFormOpen(true);
    }

    function showDetails(row) {
        setDetailRow(row);
    }

    /*
    |--------------------------------------------------------------------------
    | Create / Update
    |--------------------------------------------------------------------------
    */

    async function handleFormSubmit(payload) {
        try {
            if (formMode === 'create') {
                await axios.post(
                    '/api/enrollments',
                    payload,
                    {
                        headers: {
                            Accept: 'application/json',
                        },
                    }
                );

                await Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'KRS berhasil dibuat.',
                });

            } else {
                await axios.put(
                    `/api/enrollments/${selectedRow.id}`,
                    payload,
                    {
                        headers: {
                            Accept: 'application/json',
                        },
                    }
                );

                await Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'KRS berhasil diperbarui.',
                });
            }

            setFormOpen(false);
            setSelectedRow(null);

            await fetchData(meta.current_page);

        } catch (error) {
            console.error(error);

            const backendErrors =
                error.response?.data?.errors;

            let message =
                error.response?.data?.message
                ?? 'Terjadi kesalahan.';

            if (backendErrors) {
                message = Object.values(backendErrors)
                    .flat()
                    .join('\n');
            }

            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: message,
            });
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Delete
    |--------------------------------------------------------------------------
    */

    async function handleDelete(id) {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'Hapus KRS?',
            text: 'Data enrollment akan dihapus. Data mahasiswa dan mata kuliah tetap disimpan.',
            showCancelButton: true,
            confirmButtonText: 'Ya, hapus',
            cancelButtonText: 'Batal',
        });

        if (!result.isConfirmed) {
            return;
        }

        try {
            await axios.delete(
                `/api/enrollments/${id}`,
                {
                    headers: {
                        Accept: 'application/json',
                    },
                }
            );

            await Swal.fire({
                icon: 'success',
                title: 'Berhasil',
                text: 'KRS berhasil dihapus.',
            });

            /*
             * Kalau row terakhir di halaman terhapus,
             * mundur satu page supaya tidak dapat halaman kosong.
             */
            const targetPage =
                rows.length === 1 &&
                meta.current_page > 1
                    ? meta.current_page - 1
                    : meta.current_page;

            await fetchData(targetPage);

        } catch (error) {
            console.error(error);

            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text:
                    error.response?.data?.message
                    ?? 'Gagal menghapus data.',
            });
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Export
    |--------------------------------------------------------------------------
    |
    | Export mengikuti quick filter/search aktif.
    */

    function handleExport() {
        const params = new URLSearchParams();

        if (search.trim() !== '') {
            params.set('search', search.trim());
        }

        if (status) {
            params.set('status', status);
        }

        if (semester) {
            params.set('semester', semester);
        }

        const activeAdvancedFilters =
            advancedFilters.filter(
                (filter) =>
                    String(filter.value ?? '').trim() !== ''
            );

        if (activeAdvancedFilters.length > 0) {
            const filters = advancedFilters.filter(
                (filter) =>
                    String(filter.value ?? '').trim() !== ''
            );

            params.set(
                'filters',
                JSON.stringify(filters.map(normalizeFilterValue))
            );

            params.set(
                'filter_logic',
                filterLogic
            );
        }

        const activeFilterGroups =
            filterGroups
                .map((group) => ({
                    logic: group.logic,
                    filters: group.filters.filter(
                        (filter) =>
                            String(filter.value ?? '').trim() !== ''
                    ),
                }))
                .filter(
                    (group) =>
                        group.filters.length > 0
                );

        if (activeFilterGroups.length > 0) {
            params.set(
                'filter_groups',
                JSON.stringify(activeFilterGroups.map((group) => ({
                    ...group,
                    filters: group.filters.map(
                        normalizeFilterValue
                    ),
                })))
            );

            params.set(
                'group_logic',
                groupLogic
            );
        }

        if (multiSorts.length > 0) {
            params.set(
                'sorts',
                JSON.stringify(multiSorts)
            );
        }

        const queryString = params.toString();

        window.location.href =
            `/api/enrollments/export${
                queryString
                    ? `?${queryString}`
                    : ''
            }`;
    }

    function updateFilter(index, key, value) {
        setAdvancedFilters((prev) =>
            prev.map((item, i) =>
                i === index
                    ? {
                        ...item,
                        [key]: value,
                    }
                    : item
            )
        );
    }

    function addFilter() {
        setAdvancedFilters((prev) => [
            ...prev,
            {
                field: 'student_nim',
                operator: 'contains',
                value: '',
            },
        ]);
    }

    function removeFilter(index) {
        setAdvancedFilters((prev) =>
            prev.filter((_, i) => i !== index)
        );
    }

    function updateSort(index, key, value) {
        setMultiSorts((prev) =>
            prev.map((item, i) =>
                i === index
                    ? {
                        ...item,
                        [key]: value,
                    }
                    : item
            )
        );
    }

    function addSort() {
        setMultiSorts((prev) => [
            ...prev,
            {
                field: 'student_nim',
                direction: 'asc',
            },
        ]);
    }

    function removeSort(index) {
        setMultiSorts((prev) =>
            prev.filter((_, i) => i !== index)
        );
    }

    function updateGroupLogic(groupIndex, value) {
        setFilterGroups((prev) =>
            prev.map((group, index) =>
                index === groupIndex
                    ? {
                        ...group,
                        logic: value,
                    }
                    : group
            )
        );
    }

    function updateGroupFilter(
        groupIndex,
        filterIndex,
        key,
        value
    ) {
        setFilterGroups((prev) =>
            prev.map((group, index) => {
                if (index !== groupIndex) {
                    return group;
                }

                return {
                    ...group,
                    filters: group.filters.map(
                        (filter, currentFilterIndex) =>
                            currentFilterIndex === filterIndex
                                ? {
                                    ...filter,
                                    [key]: value,
                                }
                                : filter
                    ),
                };
            })
        );
    }

    function addGroupFilter(groupIndex) {
        setFilterGroups((prev) =>
            prev.map((group, index) =>
                index === groupIndex
                    ? {
                        ...group,
                        filters: [
                            ...group.filters,
                            {
                                field: 'student_nim',
                                operator: 'contains',
                                value: '',
                            },
                        ],
                    }
                    : group
            )
        );
    }

    function removeGroupFilter(
        groupIndex,
        filterIndex
    ) {
        setFilterGroups((prev) =>
            prev.map((group, index) =>
                index === groupIndex
                    ? {
                        ...group,
                        filters: group.filters.filter(
                            (_, currentFilterIndex) =>
                                currentFilterIndex !== filterIndex
                        ),
                    }
                    : group
            )
        );
    }

    function resetAdvanced() {
        setFilterLogic('AND');

        setAdvancedFilters([
            {
                field: 'student_nim',
                operator: 'contains',
                value: '',
            },
        ]);

        setMultiSorts([
            {
                field: 'academic_year',
                direction: 'desc',
            },
        ]);

        setGroupLogic('AND');

        setFilterGroups([
            {
                name: 'Group A',
                logic: 'AND',
                filters: [
                    {
                        field: 'academic_year',
                        operator: 'equal',
                        value: '',
                    },
                ],
            },
            {
                name: 'Group B',
                logic: 'AND',
                filters: [
                    {
                        field: 'status',
                        operator: 'equal',
                        value: '',
                    },
                ],
            },
        ]);

        fetchData(1);
    }

    return (
        <div className="page-container">

            {/* Header */}
            <div className="page-header">
                <div>
                    <div className="eyebrow">
                        <span className="eyebrow-dot" />
                        Enrollment workspace
                    </div>

                    <h1>
                        Academic Enrollment Management
                    </h1>

                    <p>
                        Kelola data KRS mahasiswa dengan pencarian, filter, dan
                        sorting server-side.
                    </p>
                </div>

                <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                        setDetailRow(null);
                        openCreate();
                    }}
                >
                    <FontAwesomeIcon icon={faPlus} />
                    Create KRS
                </button>
            </div>

            <div className="summary-grid">
                <div className="summary-card summary-card-dark">
                    <span className="summary-label">Total enrollment</span>
                    <strong>{Number(meta.total).toLocaleString()}</strong>
                    <span className="summary-caption">Data sesuai query aktif</span>
                </div>

                <div className="summary-card">
                    <span className="summary-label">Current page</span>
                    <strong>{meta.current_page} <small>/ {meta.last_page}</small></strong>
                    <span className="summary-caption">Maksimal 25 data per halaman</span>
                </div>

                <div className="summary-card">
                    <span className="summary-label">Query status</span>
                    <strong>{loading ? 'Syncing...' : 'Ready'}</strong>
                    <span className="summary-caption">Filter diproses oleh server</span>
                </div>
            </div>

            {/* Toolbar */}
            <div className="toolbar">

                <div className="search-field">
                    <FontAwesomeIcon icon={faSearch} />
                    <input
                        className="search-input"
                        type="text"
                        aria-label="Search enrollment"
                        placeholder="Search NIM, student, course code..."
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                    />
                </div>

                <select
                    value={status}
                    onChange={(e) =>
                        setStatus(e.target.value)
                    }
                >
                    <option value="">
                        All Status
                    </option>

                    <option value="DRAFT">
                        Draft
                    </option>

                    <option value="SUBMITTED">
                        Submitted
                    </option>

                    <option value="APPROVED">
                        Approved
                    </option>

                    <option value="REJECTED">
                        Rejected
                    </option>
                </select>

                <select
                    value={semester}
                    onChange={(e) =>
                        setSemester(e.target.value)
                    }
                >
                    <option value="">
                        All Semester
                    </option>

                    <option value="GANJIL">
                        Ganjil
                    </option>

                    <option value="GENAP">
                        Genap
                    </option>
                </select>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                        setAdvancedOpen((open) => !open)
                    }
                >
                    <FontAwesomeIcon icon={faFilter} />
                    Advanced Filter
                </button>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={handleExport}
                >
                    <FontAwesomeIcon icon={faDownload} />
                    Export CSV
                </button>

            </div>

{advancedOpen && (
    <div className="advanced-query-panel">

        <div className="advanced-query-header">
            <div>
            <div className="advanced-query-kicker">
                <span>01</span>
                Query workspace
            </div>
            <h3>Build your query</h3>
            <p>
                Gunakan filter sederhana, kelompokkan kondisi, lalu atur prioritas sorting.
            </p>
        </div>

            <button
                type="button"
                className="secondary-button"
                onClick={resetAdvanced}
            >
                <FontAwesomeIcon icon={faRotate} />
                Reset
            </button>
        </div>

        <div className="advanced-query-grid">

            {/* FILTER SECTION */}
            <div className="advanced-card">
                <div className="advanced-step">01</div>
                <div className="advanced-card-header">
                    <div>
                        <h4>Advanced Filters</h4>
                        <p>
                            Cocok untuk pencarian langsung berdasarkan satu atau beberapa kondisi.
                        </p>
                    </div>

                    <div className="logic-box">
                        <label>Filter Logic</label>
                        <select
                            value={filterLogic}
                            onChange={(e) =>
                                setFilterLogic(e.target.value)
                            }
                        >
                            <option value="AND">AND</option>
                            <option value="OR">OR</option>
                        </select>
                    </div>
                </div>

                <div className="advanced-list">
                    {advancedFilters.map((filter, index) => (
                        <div
                            className="advanced-item"
                            key={`filter-${index}`}
                        >
                            <div className="advanced-item-grid">
                                <div className="form-group">
                                    <label>Field</label>
                                    <select
                                        value={filter.field}
                                        onChange={(e) =>
                                            updateFilter(
                                                index,
                                                'field',
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="student_nim">Student NIM</option>
                                        <option value="student_name">Student Name</option>
                                        <option value="course_code">Course Code</option>
                                        <option value="course_name">Course Name</option>
                                        <option value="student_email">Student Email</option>
                                        <option value="credits">SKS</option>
                                        <option value="semester">Semester</option>
                                        <option value="academic_year">Academic Year</option>
                                        <option value="status">Status</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Operator</label>
                                    <select
                                        value={filter.operator}
                                        onChange={(e) =>
                                            updateFilter(
                                                index,
                                                'operator',
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="contains">Contains</option>
                                        <option value="startsWith">Starts With</option>
                                        <option value="equal">Equal</option>
                                        <option value="in">In (comma separated)</option>
                                        <option value="between">Between (a,b)</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Value</label>
                                    <input
                                        type="text"
                                        placeholder="Masukkan nilai filter"
                                        value={filter.value}
                                        onChange={(e) =>
                                            updateFilter(
                                                index,
                                                'value',
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>

                                <div className="item-action">
                                    <button
                                        type="button"
                                        className="danger-outline-button"
                                        onClick={() => removeFilter(index)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={addFilter}
                >
                    <FontAwesomeIcon icon={faCirclePlus} />
                    Add Filter
                </button>
            </div>

            {/* FILTER GROUPS SECTION */}
            <div className="advanced-card">
                <div className="advanced-step">02</div>
                <div className="advanced-card-header">
                    <div>
                        <h4>Filter Groups A / B</h4>
                        <p>
                            Gabungkan Group A dan B untuk skenario query yang lebih spesifik.
                        </p>
                    </div>

                    <div className="logic-box">
                        <label>Group Logic</label>
                        <select
                            value={groupLogic}
                            onChange={(e) =>
                                setGroupLogic(e.target.value)
                            }
                        >
                            <option value="AND">AND</option>
                            <option value="OR">OR</option>
                        </select>
                    </div>
                </div>

                {filterGroups.map((group, groupIndex) => (
                    <div
                        className="filter-group-card"
                        key={group.name}
                    >
                        <div className="filter-group-header">
                            <strong>{group.name}</strong>

                            <select
                                value={group.logic}
                                onChange={(e) =>
                                    updateGroupLogic(
                                        groupIndex,
                                        e.target.value
                                    )
                                }
                            >
                                <option value="AND">AND</option>
                                <option value="OR">OR</option>
                            </select>
                        </div>

                        {group.filters.map((filter, filterIndex) => (
                            <div
                                className="advanced-item-grid"
                                key={`${group.name}-${filterIndex}`}
                            >
                                <div className="form-group">
                                    <label>Field</label>
                                    <select
                                        value={filter.field}
                                        onChange={(e) =>
                                            updateGroupFilter(
                                                groupIndex,
                                                filterIndex,
                                                'field',
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="student_nim">Student NIM</option>
                                        <option value="student_name">Student Name</option>
                                        <option value="course_code">Course Code</option>
                                        <option value="course_name">Course Name</option>
                                        <option value="student_email">Student Email</option>
                                        <option value="credits">SKS</option>
                                        <option value="semester">Semester</option>
                                        <option value="academic_year">Academic Year</option>
                                        <option value="status">Status</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Operator</label>
                                    <select
                                        value={filter.operator}
                                        onChange={(e) =>
                                            updateGroupFilter(
                                                groupIndex,
                                                filterIndex,
                                                'operator',
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="equal">Equal</option>
                                        <option value="contains">Contains</option>
                                        <option value="startsWith">Starts With</option>
                                        <option value="in">In (comma separated)</option>
                                        <option value="between">Between (a,b)</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Value</label>
                                    {filter.field === 'status' ? (
                                        <select
                                            value={filter.value}
                                            onChange={(e) =>
                                                updateGroupFilter(
                                                    groupIndex,
                                                    filterIndex,
                                                    'value',
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option value="">
                                                Select Status
                                            </option>
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
                                    ) : filter.field === 'semester' ? (
                                        <select
                                            value={filter.value}
                                            onChange={(e) =>
                                                updateGroupFilter(
                                                    groupIndex,
                                                    filterIndex,
                                                    'value',
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option value="">
                                                Select Semester
                                            </option>
                                            <option value="GANJIL">
                                                GANJIL
                                            </option>
                                            <option value="GENAP">
                                                GENAP
                                            </option>
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={filter.value}
                                            placeholder="Value"
                                            onChange={(e) =>
                                                updateGroupFilter(
                                                    groupIndex,
                                                    filterIndex,
                                                    'value',
                                                    e.target.value
                                                )
                                            }
                                        />
                                    )}
                                </div>

                                <div className="item-action">
                                    <button
                                        type="button"
                                        className="danger-outline-button"
                                        onClick={() =>
                                            removeGroupFilter(
                                                groupIndex,
                                                filterIndex
                                            )
                                        }
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                                addGroupFilter(groupIndex)
                            }
                        >
                            <FontAwesomeIcon icon={faCirclePlus} />
                            Add condition
                        </button>
                    </div>
                ))}
            </div>

            {/* SORT SECTION */}
            <div className="advanced-card">
                <div className="advanced-step">03</div>
                <div className="advanced-card-header">
                    <div>
                        <h4>Multi-column Sorting</h4>
                        <p>
                            Prioritas paling atas diproses terlebih dahulu, lalu dilanjutkan ke sort berikutnya.
                        </p>
                    </div>
                </div>

                <div className="advanced-list">
                    {multiSorts.map((sort, index) => (
                        <div
                            className="advanced-item"
                            key={`sort-${index}`}
                        >
                            <div className="advanced-item-grid sort-grid">
                                <div className="form-group">
                                    <label>Sort Field</label>
                                    <select
                                        value={sort.field}
                                        onChange={(e) =>
                                            updateSort(
                                                index,
                                                'field',
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="academic_year">Academic Year</option>
                                        <option value="credits">SKS</option>
                                        <option value="semester">Semester</option>
                                        <option value="student_nim">Student NIM</option>
                                        <option value="student_name">Student Name</option>
                                        <option value="course_code">Course Code</option>
                                        <option value="course_name">Course Name</option>
                                        <option value="status">Status</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Direction</label>
                                    <select
                                        value={sort.direction}
                                        onChange={(e) =>
                                            updateSort(
                                                index,
                                                'direction',
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="asc">Ascending</option>
                                        <option value="desc">Descending</option>
                                    </select>
                                </div>

                                <div className="item-action">
                                    <button
                                        type="button"
                                        className="danger-outline-button"
                                        onClick={() => removeSort(index)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={addSort}
                >
                    <FontAwesomeIcon icon={faCirclePlus} />
                    Add Sort
                </button>
            </div>

        </div>

        <div className="advanced-query-footer">
            <button
                type="button"
                className="primary-button"
                onClick={() => {
                    setAdvancedOpen(false);
                    fetchData(1);
                }}
            >
                <FontAwesomeIcon icon={faCheck} />
                Apply Query
            </button>
        </div>
    </div>
)}

            {/* Table */}
            <div className="table-card">

                {loading && (
                    <div className="loading">
                        Loading data...
                    </div>
                )}

                <table>

                    <thead>
                        <tr>

                            <th
                                onClick={() =>
                                    handleSort(
                                        'student_nim'
                                    )
                                }
                            >
                                NIM{' '}
                                {sortIndicator(
                                    'student_nim'
                                )}
                            </th>

                            <th
                                onClick={() =>
                                    handleSort(
                                        'student_name'
                                    )
                                }
                            >
                                Mahasiswa{' '}
                                {sortIndicator(
                                    'student_name'
                                )}
                            </th>

                            <th
                                onClick={() =>
                                    handleSort(
                                        'course_code'
                                    )
                                }
                            >
                                Kode MK{' '}
                                {sortIndicator(
                                    'course_code'
                                )}
                            </th>

                            <th
                                onClick={() =>
                                    handleSort(
                                        'course_name'
                                    )
                                }
                            >
                                Mata Kuliah{' '}
                                {sortIndicator(
                                    'course_name'
                                )}
                            </th>

                            <th
                                onClick={() =>
                                    handleSort('credits')
                                }
                            >
                                SKS{' '}
                                {sortIndicator('credits')}
                            </th>

                            <th
                                onClick={() =>
                                    handleSort(
                                        'semester'
                                    )
                                }
                            >
                                Semester{' '}
                                {sortIndicator(
                                    'semester'
                                )}
                            </th>

                            <th
                                onClick={() =>
                                    handleSort(
                                        'academic_year'
                                    )
                                }
                            >
                                Tahun Ajaran{' '}
                                {sortIndicator(
                                    'academic_year'
                                )}
                            </th>

                            <th
                                onClick={() =>
                                    handleSort(
                                        'status'
                                    )
                                }
                            >
                                Status{' '}
                                {sortIndicator(
                                    'status'
                                )}
                            </th>

                            <th>
                                Action
                            </th>

                        </tr>
                    </thead>

                    <tbody>

                        {rows.map((row) => (
                            <tr key={row.id}>

                                <td>
                                    {row.student_nim}
                                </td>

                                <td>
                                    <strong>
                                        {row.student_name}
                                    </strong>

                                    <div className="muted">
                                        {row.student_email}
                                    </div>
                                </td>

                                <td>
                                    {row.course_code}
                                </td>

                                <td>
                                    {row.course_name}
                                </td>

                                <td>
                                    {row.credits}
                                </td>

                                <td>
                                    {row.semester}
                                </td>

                                <td>
                                    {row.academic_year}
                                </td>

                                <td>
                                    <span
                                        className={
                                            `badge badge-${row.status.toLowerCase()}`
                                        }
                                    >
                                        {row.status}
                                    </span>
                                </td>

                                <td>
                                    <button
                                        type="button"
                                        className="table-action detail-action"
                                        title="Lihat detail enrollment"
                                        onClick={() =>
                                            showDetails(row)
                                        }
                                    >
                                        <FontAwesomeIcon icon={faEye} />
                                        Detail
                                    </button>

                                    <button
                                        type="button"
                                        className="table-action edit-action"
                                        title="Edit enrollment"
                                        onClick={() =>
                                            openEdit(row)
                                        }
                                    >
                                        <FontAwesomeIcon icon={faPenToSquare} />
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        className="table-action delete-action"
                                        title="Hapus enrollment"
                                        onClick={() =>
                                            handleDelete(
                                                row.id
                                            )
                                        }
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                        Delete
                                    </button>
                                </td>

                            </tr>
                        ))}

                        {!loading &&
                            rows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan="9"
                                        className="empty-state"
                                    >
                                        Data tidak ditemukan.
                                    </td>
                                </tr>
                            )}

                    </tbody>

                </table>

                {/* Pagination */}
                <div className="pagination">

                    <div>
                        Showing{' '}

                        {meta.total === 0
                            ? 0
                            : (
                                (meta.current_page - 1)
                                * meta.per_page
                            ) + 1}

                        {' - '}

                        {Math.min(
                            meta.current_page
                            * meta.per_page,
                            meta.total
                        )}

                        {' of '}

                        {Number(
                            meta.total
                        ).toLocaleString()}
                    </div>

                    <div className="pagination-buttons">

                        <button
                            type="button"
                            disabled={
                                meta.current_page <= 1
                            }
                            onClick={() =>
                                fetchData(
                                    meta.current_page - 1
                                )
                            }
                        >
                            Previous
                        </button>

                        <span>
                            Page{' '}
                            {meta.current_page}
                            {' of '}
                            {meta.last_page}
                        </span>

                        <button
                            type="button"
                            disabled={
                                meta.current_page
                                >= meta.last_page
                            }
                            onClick={() =>
                                fetchData(
                                    meta.current_page + 1
                                )
                            }
                        >
                            Next
                        </button>

                    </div>

                </div>

            </div>

            {/* Create / Edit Modal */}
            <EnrollmentForm
                open={formOpen}
                mode={formMode}
                selectedData={selectedRow}
                onClose={() => {
                    setFormOpen(false);
                    setSelectedRow(null);
                }}
                onSubmit={handleFormSubmit}
            />

            {detailRow && (
                <div className="krs-modal-overlay">
                    <div
                        className="krs-modal detail-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="detail-modal-title"
                    >
                        <div className="krs-modal-header">
                            <div>
                                <span className="krs-modal-eyebrow">
                                    ENROLLMENT DETAIL
                                </span>

                                <h2 id="detail-modal-title">
                                    Detail KRS
                                </h2>

                                <p>
                                    Ringkasan informasi mahasiswa dan mata kuliah.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="krs-modal-close"
                                aria-label="Tutup detail"
                                onClick={() => setDetailRow(null)}
                            >
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        </div>

                        <div className="detail-modal-body">
                            <div className="detail-profile">
                                <div className="detail-avatar">
                                    {detailRow.student_name
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>

                                <div>
                                    <h3>{detailRow.student_name}</h3>
                                    <p>{detailRow.student_nim}</p>
                                </div>

                                <span
                                    className={
                                        `badge badge-${detailRow.status.toLowerCase()}`
                                    }
                                >
                                    {detailRow.status}
                                </span>
                            </div>

                            <div className="detail-section">
                                <h4>Data Mahasiswa</h4>

                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span>Email</span>
                                        <strong>{detailRow.student_email}</strong>
                                    </div>

                                    <div className="detail-item">
                                        <span>NIM</span>
                                        <strong>{detailRow.student_nim}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h4>Data Mata Kuliah</h4>

                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span>Kode Mata Kuliah</span>
                                        <strong>{detailRow.course_code}</strong>
                                    </div>

                                    <div className="detail-item">
                                        <span>Nama Mata Kuliah</span>
                                        <strong>{detailRow.course_name}</strong>
                                    </div>

                                    <div className="detail-item">
                                        <span>SKS</span>
                                        <strong>{detailRow.credits}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h4>Informasi Akademik</h4>

                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span>Semester</span>
                                        <strong>{detailRow.semester}</strong>
                                    </div>

                                    <div className="detail-item">
                                        <span>Tahun Ajaran</span>
                                        <strong>{detailRow.academic_year}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="detail-modal-footer">
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => setDetailRow(null)}
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default EnrollmentPage;