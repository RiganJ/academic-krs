<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->index('credits', 'courses_credits_index');
        });

        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('CREATE INDEX IF NOT EXISTS students_email_trgm_index
            ON students USING gin (email gin_trgm_ops)');
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropIndex('courses_credits_index');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement(
                'DROP INDEX IF EXISTS students_email_trgm_index'
            );
        }
    }
};
