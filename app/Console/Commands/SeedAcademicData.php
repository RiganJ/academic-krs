<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SeedAcademicData extends Command
{
    protected $signature = 'academic:seed
        {--count=5000000 : Jumlah enrollment yang dibuat}
        {--courses=200 : Jumlah mata kuliah}';

    protected $description = 'Seed academic data for large dataset performance testing';

    public function handle(): int
    {
        $targetCount = (int) $this->option('count');
        $courseCount = (int) $this->option('courses');
        $studentCount = 7 * 50 * 100;

        if ($targetCount < 1 || $courseCount < 1) {
            $this->error('Semua parameter harus lebih besar dari 0.');

            return self::FAILURE;
        }

        $maxUniqueCombinations = $studentCount * $courseCount;

        if ($targetCount > $maxUniqueCombinations) {
            $this->error(
                "Target {$targetCount} melebihi jumlah kombinasi unik " .
                number_format($maxUniqueCombinations) .
                '.'
            );

            return self::FAILURE;
        }

        $this->warn('Menghapus dataset lama...');

        DB::statement('
            TRUNCATE TABLE
                enrollments,
                students,
                courses
            RESTART IDENTITY CASCADE
        ');

        $this->info('Dataset lama berhasil dihapus.');

        $now = now();
        $years = ['20', '21', '22', '23', '24', '25', '26'];
        $programCodes = [];

        for ($i = 1; $i <= 50; $i++) {
            $programCodes[] = str_pad(
                (string) $i,
                4,
                '0',
                STR_PAD_LEFT
            );
        }

        $firstNames = [
            'Ahmad', 'Rizky', 'Muhammad', 'Fajar', 'Dimas',
            'Andi', 'Ilham', 'Farhan', 'Rafi', 'Yoga',
            'Nadia', 'Putri', 'Aulia', 'Nabila', 'Salsa',
            'Rani', 'Aisyah', 'Zahra', 'Intan', 'Citra',
        ];

        $lastNames = [
            'Pratama', 'Saputra', 'Ramadhan', 'Hidayat', 'Wijaya',
            'Maulana', 'Kurniawan', 'Firmansyah', 'Akbar', 'Syahputra',
            'Permata', 'Sari', 'Ananda', 'Fauzi', 'Rahman',
            'Hakim', 'Setiawan', 'Nugraha', 'Aditya', 'Mahendra',
        ];

        $this->info('Membuat 35.000 mahasiswa...');

        $studentRows = [];
        $batchSize = 5000;
        $globalIndex = 1;

        foreach ($years as $year) {
            foreach ($programCodes as $programCode) {
                for ($sequence = 0; $sequence <= 99; $sequence++) {
                    $sequenceFormatted = str_pad(
                        (string) $sequence,
                        2,
                        '0',
                        STR_PAD_LEFT
                    );

                    $nim = $year . $programCode . $sequenceFormatted;
                    $firstName = $firstNames[
                        ($globalIndex - 1) % count($firstNames)
                    ];
                    $lastName = $lastNames[
                        intdiv($globalIndex - 1, count($firstNames))
                        % count($lastNames)
                    ];

                    $studentRows[] = [
                        'nim' => $nim,
                        'name' => $firstName . ' ' . $lastName . ' ' .
                            str_pad((string) $globalIndex, 5, '0', STR_PAD_LEFT),
                        'email' => strtolower(
                            $firstName . '.' . $lastName . '.' . $nim .
                            '@student.example.test'
                        ),
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];

                    if (count($studentRows) >= $batchSize) {
                        DB::table('students')->insert($studentRows);
                        $studentRows = [];
                    }

                    $globalIndex++;
                }
            }
        }

        if (!empty($studentRows)) {
            DB::table('students')->insert($studentRows);
        }

        $this->info('Mahasiswa tersedia: ' . number_format($studentCount));

        $this->info('Membuat data mata kuliah...');

        $courseRows = [];

        for ($i = 1; $i <= $courseCount; $i++) {
            $courseRows[] = [
                'code' => 'TS' . str_pad(
                    (string) $i,
                    3,
                    '0',
                    STR_PAD_LEFT
                ),
                'name' => 'Mata Kuliah ' . $i,
                'credits' => (($i - 1) % 6) + 1,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('courses')->insert($courseRows);

        $this->info('Mata kuliah tersedia: ' . number_format($courseCount));
        $this->newLine();
        $this->info('Membuat enrollment...');

        $chunkSize = 100000;
        $bar = $this->output->createProgressBar($targetCount);
        $bar->start();

        for ($start = 0; $start < $targetCount; $start += $chunkSize) {
            $end = min($start + $chunkSize - 1, $targetCount - 1);

            DB::statement(
                "
                WITH seeded_students AS (
                    SELECT id,
                           ROW_NUMBER() OVER (ORDER BY id) - 1 AS rn
                    FROM students
                ),
                seeded_courses AS (
                    SELECT id,
                           ROW_NUMBER() OVER (ORDER BY id) - 1 AS rn
                    FROM courses
                ),
                numbers AS (
                    SELECT generate_series({$start}, {$end}) AS n
                )
                INSERT INTO enrollments (
                    student_id,
                    course_id,
                    academic_year,
                    semester,
                    status,
                    created_at,
                    updated_at
                )
                SELECT
                    s.id,
                    c.id,
                    '2026/2027',
                    'GANJIL',
                    CASE (numbers.n % 4)
                        WHEN 0 THEN 'DRAFT'
                        WHEN 1 THEN 'SUBMITTED'
                        WHEN 2 THEN 'APPROVED'
                        ELSE 'REJECTED'
                    END,
                    NOW(),
                    NOW()
                FROM numbers
                INNER JOIN seeded_students s
                    ON s.rn = FLOOR(numbers.n / {$courseCount})
                INNER JOIN seeded_courses c
                    ON c.rn = numbers.n % {$courseCount}
                ON CONFLICT DO NOTHING
                "
            );

            $bar->advance($end - $start + 1);
        }

        $bar->finish();
        $this->newLine(2);

        $totalEnrollment = DB::table('enrollments')->count();
        $this->info(
            'Total enrollment di database: ' .
            number_format($totalEnrollment)
        );

        if ($totalEnrollment < $targetCount) {
            $this->error(
                'Total enrollment lebih kecil dari target. ' .
                'Periksa kapasitas kombinasi student dan course.'
            );

            return self::FAILURE;
        }

        if ($totalEnrollment !== $targetCount) {
            $this->error(
                'Total enrollment tidak sama dengan target. ' .
                'Target: ' . number_format($targetCount) .
                ', aktual: ' . number_format($totalEnrollment) . '.'
            );

            return self::FAILURE;
        }

        $this->info('Seeder selesai tanpa error.');

        return self::SUCCESS;
    }
}
