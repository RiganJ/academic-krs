<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        DB::statement(
            'CREATE INDEX IF NOT EXISTS students_nim_trgm_index
             ON students USING gin (nim gin_trgm_ops)'
        );

        DB::statement(
            'CREATE INDEX IF NOT EXISTS students_name_trgm_index
             ON students USING gin (name gin_trgm_ops)'
        );

        DB::statement(
            'CREATE INDEX IF NOT EXISTS courses_code_trgm_index
             ON courses USING gin (code gin_trgm_ops)'
        );
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement(
            'DROP INDEX IF EXISTS students_nim_trgm_index'
        );

        DB::statement(
            'DROP INDEX IF EXISTS students_name_trgm_index'
        );

        DB::statement(
            'DROP INDEX IF EXISTS courses_code_trgm_index'
        );
    }
};
