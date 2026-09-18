<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('enrollments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('student_id')
            ->constrained('students')
            ->restricOnDelete();

            $table->foreignId('course_id')
            ->constrained('courses')
            ->restrictOnDelete();

            $table->string('academic_year', 9);
            $table->string('semester', 10);
            $table->string('status', 12);

           $table->timestamps();

           $table->unique(
            [
                'student_id',
                'course_id',
                'academic_year',
                'semester'
            ],
            'enrollments_unique_krs'
           );

           $table->index('student_id');
           $table->index('course_id');
           $table->index('academic_year');
           $table->index('semester');
           $table->index('status');

           $table->index(
            ['academic_year', 'semester', 'status'],
            'enrollments_filter_index'
           );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrollments');
    }
    /**
     * Reverse the migrations.
     */
};
