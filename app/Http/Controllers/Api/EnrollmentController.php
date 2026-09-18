<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEnrollmentRequest;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Student;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;
use Throwable;
use App\Http\Requests\UpdateEnrollmentRequest;

class EnrollmentController extends Controller
{
    /**
     * Create KRS.
     *
     * students + courses + enrollments diproses
     * dalam satu database transaction.
     */
    public function store(StoreEnrollmentRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $enrollment = DB::transaction(function () use ($validated) {
                $student = Student::updateOrCreate(
                    [
                        'nim' => $validated['student']['nim'],
                    ],
                    [
                        'name' => $validated['student']['name'],
                        'email' => $validated['student']['email'],
                    ]
                );

                $course = Course::updateOrCreate(
                    [
                        'code' => $validated['course']['code'],
                    ],
                    [
                        'name' => $validated['course']['name'],
                        'credits' => $validated['course']['credits'],
                    ]
                );

                $duplicate = Enrollment::where('student_id', $student->id)
                    ->where('course_id', $course->id)
                    ->where(
                        'academic_year',
                        $validated['enrollment']['academic_year']
                    )
                    ->where(
                        'semester',
                        $validated['enrollment']['semester']
                    )
                    ->exists();

                if ($duplicate) {
                    throw ValidationException::withMessages([
                        'enrollment' => [
                            'Mahasiswa sudah mengambil mata kuliah ini pada tahun ajaran dan semester yang sama.',
                        ],
                    ]);
                }

                return Enrollment::create([
                    'student_id' => $student->id,
                    'course_id' => $course->id,
                    'academic_year' =>
                        $validated['enrollment']['academic_year'],
                    'semester' =>
                        $validated['enrollment']['semester'],
                    'status' =>
                        $validated['enrollment']['status'],
                ]);
            });

            return response()->json([
                'message' => 'KRS berhasil dibuat.',
                'data' => $enrollment->load([
                    'student',
                    'course',
                ]),
            ], 201);

        } catch (ValidationException $e) {
            throw $e;

        } catch (QueryException $e) {
            report($e);

            if ($e->getCode() !== '23505') {
                return response()->json([
                    'message' =>
                        'Terjadi kesalahan database saat membuat KRS.',
                ], 500);
            }

            return response()->json([
                'message' =>
                    'Data mahasiswa, mata kuliah, atau KRS sudah ada.',
            ], 422);

        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'message' =>
                    'Terjadi kesalahan saat membuat KRS.',
            ], 500);
        }
    }

    /**
     * List KRS.
     *
     * Mendukung:
     * - server-side pagination
     * - search
     * - quick filters
     * - single sorting
     * - advanced filters
     * - filter groups AND/OR
     * - multi-column sorting
     */
    public function index(Request $request): JsonResponse
    {
        /*
        |--------------------------------------------------------------------------
        | Pagination
        |--------------------------------------------------------------------------
        */

        $pageSize = (int) $request->query('page_size', 25);

        $pageSize = max(
            10,
            min($pageSize, 100)
        );

        /*
        |--------------------------------------------------------------------------
        | Quick Search / Quick Filters
        |--------------------------------------------------------------------------
        */

        $search = trim(
            (string) $request->query('search', '')
        );

        $status = $request->query('status');
        $semester = $request->query('semester');

        /*
        |--------------------------------------------------------------------------
        | Advanced Filter
        |--------------------------------------------------------------------------
        */

        $advancedFilters =
            $request->query('filters');

        $filterLogic =
            strtoupper(
                (string) $request->query(
                    'filter_logic',
                    'AND'
                )
            );

        /*
        |--------------------------------------------------------------------------
        | Filter Groups (TS-10)
        |--------------------------------------------------------------------------
        */

        $filterGroups =
            $request->query('filter_groups');

        $groupLogic =
            strtoupper(
                (string) $request->query(
                    'group_logic',
                    'AND'
                )
            );

        $multiSort =
            $request->query('sorts');

        /*
        |--------------------------------------------------------------------------
        | Sorting
        |--------------------------------------------------------------------------
        */

        $sortBy =
            $request->query(
                'sort_by',
                'created_at'
            );

        $sortDirection =
            strtolower(
                (string) $request->query(
                    'sort_direction',
                    'desc'
                )
            );

        $multiSort =
            $request->query('sorts');

        /*
        |--------------------------------------------------------------------------
        | Allowed Sort Columns
        |--------------------------------------------------------------------------
        */

        $allowedSortColumns = [
            'student_nim' =>
                'students.nim',

            'student_name' =>
                'students.name',

            'course_code' =>
                'courses.code',

            'course_name' =>
                'courses.name',

            'student_email' =>
                'students.email',

            'credits' =>
                'courses.credits',

            'semester' =>
                'enrollments.semester',

            'academic_year' =>
                'enrollments.academic_year',

            'status' =>
                'enrollments.status',

            'created_at' =>
                'enrollments.created_at',
        ];

        /*
        |--------------------------------------------------------------------------
        | Base Query
        |--------------------------------------------------------------------------
        */

        $query = Enrollment::query()
            ->join(
                'students',
                'students.id',
                '=',
                'enrollments.student_id'
            )
            ->join(
                'courses',
                'courses.id',
                '=',
                'enrollments.course_id'
            )
            ->select([
                'enrollments.id',

                'students.nim as student_nim',
                'students.name as student_name',
                'students.email as student_email',

                'courses.code as course_code',
                'courses.name as course_name',
                'courses.credits',

                'enrollments.semester',
                'enrollments.academic_year',
                'enrollments.status',

                'enrollments.created_at',
                'enrollments.updated_at',
            ]);

        /*
        |--------------------------------------------------------------------------
        | Live Search
        |--------------------------------------------------------------------------
        */

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where(
                    'students.nim',
                    'ILIKE',
                    "%{$search}%"
                )
                ->orWhere(
                    'students.name',
                    'ILIKE',
                    "%{$search}%"
                )
                ->orWhere(
                    'courses.code',
                    'ILIKE',
                    "%{$search}%"
                );
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Quick Filter: Status
        |--------------------------------------------------------------------------
        */

        if ($status) {
            $allowedStatuses = [
                'DRAFT',
                'SUBMITTED',
                'APPROVED',
                'REJECTED',
            ];

            if (
                in_array(
                    $status,
                    $allowedStatuses,
                    true
                )
            ) {
                $query->where(
                    'enrollments.status',
                    $status
                );
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Quick Filter: Semester
        |--------------------------------------------------------------------------
        */

        if ($semester) {
            $allowedSemesters = [
                'GANJIL',
                'GENAP',
            ];

            if (
                in_array(
                    $semester,
                    $allowedSemesters,
                    true
                )
            ) {
                $query->where(
                    'enrollments.semester',
                    $semester
                );
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Advanced Filter
        |--------------------------------------------------------------------------
        */

        if ($advancedFilters) {
            $decodedFilters =
                json_decode(
                    $advancedFilters,
                    true
                );

            if (is_array($decodedFilters)) {
                $this->applyAdvancedFilters(
                    $query,
                    $decodedFilters,
                    $filterLogic
                );
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Filter Groups A/B
        |--------------------------------------------------------------------------
        */

        if ($filterGroups) {
            $decodedGroups =
                json_decode(
                    $filterGroups,
                    true
                );

            if (is_array($decodedGroups)) {
                $this->applyFilterGroups(
                    $query,
                    $decodedGroups,
                    $groupLogic
                );
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Multi-Column Sorting
        |--------------------------------------------------------------------------
        */

        $multiSortApplied = false;

        if ($multiSort) {
            $decodedSorts =
                json_decode(
                    $multiSort,
                    true
                );

            if (is_array($decodedSorts)) {
                foreach ($decodedSorts as $sort) {
                    $field =
                        $sort['field'] ?? null;

                    $direction =
                        strtolower(
                            $sort['direction']
                                ?? 'asc'
                        );

                    if (
                        isset(
                            $allowedSortColumns[$field]
                        )
                        &&
                        in_array(
                            $direction,
                            ['asc', 'desc'],
                            true
                        )
                    ) {
                        $query->orderBy(
                            $allowedSortColumns[$field],
                            $direction
                        );

                        $multiSortApplied = true;
                    }
                }
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Single Column Sort (Fallback)
        |--------------------------------------------------------------------------
        */

        if (!$multiSortApplied) {
            if (
                !isset(
                    $allowedSortColumns[$sortBy]
                )
            ) {
                $sortBy = 'created_at';
            }

            if (
                !in_array(
                    $sortDirection,
                    ['asc', 'desc'],
                    true
                )
            ) {
                $sortDirection = 'desc';
            }

            $query->orderBy(
                $allowedSortColumns[$sortBy],
                $sortDirection
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Stable Secondary Sort
        |--------------------------------------------------------------------------
        |
        | Supaya pagination konsisten jika ada nilai sort yang sama.
        */

        $query->orderBy(
            'enrollments.id',
            'desc'
        );

        /*
        |--------------------------------------------------------------------------
        | Pagination
        |--------------------------------------------------------------------------
        */

        $enrollments =
            $query
                ->paginate($pageSize)
                ->withQueryString();

        return response()->json([
            'message' =>
                'Data KRS berhasil diambil.',

            'data' =>
                $enrollments->items(),

            'meta' => [
                'current_page' =>
                    $enrollments->currentPage(),

                'per_page' =>
                    $enrollments->perPage(),

                'total' =>
                    $enrollments->total(),

                'last_page' =>
                    $enrollments->lastPage(),

                'from' =>
                    $enrollments->firstItem(),

                'to' =>
                    $enrollments->lastItem(),
            ],
        ]);
    }

    /**
     * Advanced filter sederhana.
     *
     * Contoh:
     * filters=[...]
     * filter_logic=AND / OR
     */
    private function applyAdvancedFilters(
        $query,
        array $filters,
        string $logic = 'AND'
    ): void {
        $logic =
            strtoupper($logic) === 'OR'
                ? 'OR'
                : 'AND';

        $query->where(
            function ($group) use (
                $filters,
                $logic
            ) {
                $this->applyFilterConditions(
                    $group,
                    $filters,
                    $logic
                );
            }
        );
    }

    /**
     * Filter Groups untuk TS-10.
     *
     * Group A dan B dapat dikombinasikan
     * menggunakan AND / OR.
     */
    private function applyFilterGroups(
        $query,
        array $groups,
        string $groupLogic = 'AND'
    ): void {
        $groupLogic =
            strtoupper($groupLogic) === 'OR'
                ? 'OR'
                : 'AND';

        $query->where(
            function ($outerQuery) use (
                $groups,
                $groupLogic
            ) {
                foreach (
                    $groups as $index => $group
                ) {
                    $filters =
                        $group['filters'] ?? [];

                    if (
                        !is_array($filters)
                        || empty($filters)
                    ) {
                        continue;
                    }

                    $innerLogic =
                        strtoupper(
                            $group['logic']
                                ?? 'AND'
                        );

                    $innerLogic =
                        $innerLogic === 'OR'
                            ? 'OR'
                            : 'AND';

                    $callback =
                        function ($innerQuery) use (
                            $filters,
                            $innerLogic
                        ) {
                            $this
                                ->applyFilterConditions(
                                    $innerQuery,
                                    $filters,
                                    $innerLogic
                                );
                        };

                    if (
                        $groupLogic === 'OR'
                        && $index > 0
                    ) {
                        $outerQuery
                            ->orWhere($callback);
                    } else {
                        $outerQuery
                            ->where($callback);
                    }
                }
            }
        );
    }

    /**
     * Apply individual filter conditions.
     */
    private function applyFilterConditions(
        $query,
        array $filters,
        string $logic
    ): void {
        $allowedFields = [
            'student_nim' =>
                'students.nim',

            'student_name' =>
                'students.name',

            'course_code' =>
                'courses.code',

            'course_name' =>
                'courses.name',

            'student_email' =>
                'students.email',

            'credits' =>
                'courses.credits',

            'semester' =>
                'enrollments.semester',

            'academic_year' =>
                'enrollments.academic_year',

            'status' =>
                'enrollments.status',
        ];

        foreach ($filters as $filter) {
            $field =
                $filter['field'] ?? null;

            $operator =
                $filter['operator'] ?? null;

            $value =
                $filter['value'] ?? null;

            if (
                !isset(
                    $allowedFields[$field]
                )
            ) {
                continue;
            }

            $column =
                $allowedFields[$field];

            $method =
                $logic === 'OR'
                    ? 'orWhere'
                    : 'where';

            switch ($operator) {
                case 'equal':
                    $query->{$method}(
                        $column,
                        '=',
                        $value
                    );
                    break;

                case 'contains':
                    if (is_scalar($value)) {
                        $query->{$method}(
                            $column,
                            'ILIKE',
                            '%' . $value . '%'
                        );
                    }
                    break;

                case 'startsWith':
                    if (is_scalar($value)) {
                        $query->{$method}(
                            $column,
                            'ILIKE',
                            $value . '%'
                        );
                    }
                    break;

                case 'in':
                    if (is_scalar($value)) {
                        $value = array_values(array_filter(
                            array_map('trim', explode(',', (string) $value)),
                            static fn ($item) => $item !== ''
                        ));
                    }

                    if (
                        is_array($value)
                        && !empty($value)
                        && count($value) <= 100
                        && count(array_filter(
                            $value,
                            static fn ($item) => is_scalar($item)
                        )) === count($value)
                    ) {
                        if ($logic === 'OR') {
                            $query->orWhereIn(
                                $column,
                                $value
                            );
                        } else {
                            $query->whereIn(
                                $column,
                                $value
                            );
                        }
                    }
                    break;

                case 'between':
                    if (is_scalar($value)) {
                        $value = array_map(
                            'trim',
                            explode(',', (string) $value)
                        );
                    }

                    if (
                        is_array($value)
                        &&
                        count($value) === 2
                        && count(array_filter(
                            $value,
                            static fn ($item) => is_scalar($item)
                        )) === 2
                    ) {
                        if ($logic === 'OR') {
                            $query
                                ->orWhereBetween(
                                    $column,
                                    [
                                        $value[0],
                                        $value[1],
                                    ]
                                );
                        } else {
                            $query
                                ->whereBetween(
                                    $column,
                                    [
                                        $value[0],
                                        $value[1],
                                    ]
                                );
                        }
                    }
                    break;
            }
        }
    }
    public function update(
    UpdateEnrollmentRequest $request,
    Enrollment $enrollment
): JsonResponse {
    $validated = $request->validated();

    $duplicate = Enrollment::query()
        ->where('student_id', $enrollment->student_id)
        ->where('course_id', $enrollment->course_id)
        ->where('academic_year', $validated['academic_year'])
        ->where('semester', $validated['semester'])
        ->where('id', '!=', $enrollment->id)
        ->exists();

    if ($duplicate) {
        throw ValidationException::withMessages([
            'enrollment' => [
                'KRS dengan mahasiswa, mata kuliah, tahun ajaran, dan semester tersebut sudah ada.',
            ],
        ]);
    }

    $enrollment->update([
        'academic_year' => $validated['academic_year'],
        'semester' => $validated['semester'],
        'status' => $validated['status'],
    ]);

    return response()->json([
        'message' => 'KRS berhasil diperbarui.',
        'data' => $enrollment->fresh()
            ->load(['student', 'course']),
    ]);
}
public function destroy(
    Enrollment $enrollment
): JsonResponse {
    $enrollment->delete();

    return response()->json([
        'message' => 'KRS berhasil dihapus.',
    ]);
}
public function export(Request $request)
{
    /*
    |--------------------------------------------------------------------------
    | Unlimited execution untuk export dataset besar
    |--------------------------------------------------------------------------
    */

    set_time_limit(0);

    /*
    |--------------------------------------------------------------------------
    | Parameter filter
    |--------------------------------------------------------------------------
    */

    $search = trim(
        (string) $request->query('search', '')
    );

    $status = $request->query('status');
    $semester = $request->query('semester');

    $advancedFilters =
        $request->query('filters');

    $filterLogic =
        strtoupper(
            (string) $request->query(
                'filter_logic',
                'AND'
            )
        );

    $filterGroups =
        $request->query('filter_groups');

    $groupLogic =
        strtoupper(
            (string) $request->query(
                'group_logic',
                'AND'
            )
        );

    $multiSort =
        $request->query('sorts');

    /*
    |--------------------------------------------------------------------------
    | Base Query
    |--------------------------------------------------------------------------
    */

    $query = Enrollment::query()
        ->join(
            'students',
            'students.id',
            '=',
            'enrollments.student_id'
        )
        ->join(
            'courses',
            'courses.id',
            '=',
            'enrollments.course_id'
        )
        ->select([
            'enrollments.id',

            'students.nim as student_nim',
            'students.name as student_name',
            'students.email as student_email',

            'courses.code as course_code',
            'courses.name as course_name',
            'courses.credits',

            'enrollments.semester',
            'enrollments.academic_year',
            'enrollments.status',

            'enrollments.created_at',
            'enrollments.updated_at',
        ]);

    /*
    |--------------------------------------------------------------------------
    | Live Search
    |--------------------------------------------------------------------------
    */

    if ($search !== '') {
        $query->where(function ($q) use ($search) {
            $q->where(
                'students.nim',
                'ILIKE',
                "%{$search}%"
            )
            ->orWhere(
                'students.name',
                'ILIKE',
                "%{$search}%"
            )
            ->orWhere(
                'courses.code',
                'ILIKE',
                "%{$search}%"
            );
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Quick Filter Status
    |--------------------------------------------------------------------------
    */

    if ($status) {
        $allowedStatuses = [
            'DRAFT',
            'SUBMITTED',
            'APPROVED',
            'REJECTED',
        ];

        if (
            in_array(
                $status,
                $allowedStatuses,
                true
            )
        ) {
            $query->where(
                'enrollments.status',
                $status
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Quick Filter Semester
    |--------------------------------------------------------------------------
    */

    if ($semester) {
        $allowedSemesters = [
            'GANJIL',
            'GENAP',
        ];

        if (
            in_array(
                $semester,
                $allowedSemesters,
                true
            )
        ) {
            $query->where(
                'enrollments.semester',
                $semester
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Advanced Filter
    |--------------------------------------------------------------------------
    */

    if ($advancedFilters) {
        $decodedFilters =
            json_decode(
                $advancedFilters,
                true
            );

        if (is_array($decodedFilters)) {
            $this->applyAdvancedFilters(
                $query,
                $decodedFilters,
                $filterLogic
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Filter Groups
    |--------------------------------------------------------------------------
    */

    if ($filterGroups) {
        $decodedGroups =
            json_decode(
                $filterGroups,
                true
            );

        if (is_array($decodedGroups)) {
            $this->applyFilterGroups(
                $query,
                $decodedGroups,
                $groupLogic
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Ordering
    |--------------------------------------------------------------------------
    */

    $allowedSortColumns = [
        'student_nim' => 'students.nim',
        'student_name' => 'students.name',
        'course_code' => 'courses.code',
        'course_name' =>         'courses.name',

        'student_email' =>
        'students.email',

        'credits' =>
        'courses.credits',

        'semester' => 'enrollments.semester',
        'academic_year' => 'enrollments.academic_year',
        'status' => 'enrollments.status',
        'created_at' => 'enrollments.created_at',
    ];

    $multiSortApplied = false;

    if ($multiSort) {
        $decodedSorts = json_decode($multiSort, true);

        if (is_array($decodedSorts)) {
            foreach ($decodedSorts as $sort) {
                $field = $sort['field'] ?? null;
                $direction = strtolower(
                    $sort['direction'] ?? 'asc'
                );

                if (
                    isset($allowedSortColumns[$field])
                    && in_array(
                        $direction,
                        ['asc', 'desc'],
                        true
                    )
                ) {
                    $query->orderBy(
                        $allowedSortColumns[$field],
                        $direction
                    );

                    $multiSortApplied = true;
                }
            }
        }
    }

    $query->orderBy(
        'enrollments.id',
        'asc'
    );

    /*
    |--------------------------------------------------------------------------
    | Stream CSV
    |--------------------------------------------------------------------------
    */

    $filename =
        'enrollments-' .
        now()->format('Y-m-d-His') .
        '.csv';

    return response()->streamDownload(
        function () use ($query) {

            $handle = fopen(
                'php://output',
                'w'
            );

            /*
             * UTF-8 BOM supaya Excel Windows
             * membaca karakter UTF-8 dengan benar.
             */
            fwrite(
                $handle,
                "\xEF\xBB\xBF"
            );

            /*
            |--------------------------------------------------------------------------
            | CSV Header
            |--------------------------------------------------------------------------
            */

            fputcsv($handle, [
                'ID',
                'NIM',
                'Nama Mahasiswa',
                'Email Mahasiswa',
                'Kode MK',
                'Nama MK',
                'SKS',
                'Semester',
                'Tahun Ajaran',
                'Status',
                'Created At',
                'Updated At',
            ]);

            /*
            |--------------------------------------------------------------------------
            | Cursor
            |--------------------------------------------------------------------------
            |
            | cursor() mengambil data secara bertahap,
            | bukan menyimpan jutaan row di memory PHP.
            */

            foreach ($query->cursor() as $row) {
                fputcsv($handle, [
                    $row->id,
                    $row->student_nim,
                    $row->student_name,
                    $row->student_email,
                    $row->course_code,
                    $row->course_name,
                    $row->credits,
                    $row->semester,
                    $row->academic_year,
                    $row->status,
                    $row->created_at,
                    $row->updated_at,
                ]);
            }

            fclose($handle);
        },
        $filename,
        [
            'Content-Type' =>
                'text/csv; charset=UTF-8',

            'Cache-Control' =>
                'no-store, no-cache',
        ]
    );
}
}