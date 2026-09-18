<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EnrollmentController;

Route::get(
    '/enrollments',
    [EnrollmentController::class, 'index']
);

Route::get(
    '/enrollments/export',
    [EnrollmentController::class, 'export']
);

Route::post(
    '/enrollments',
    [EnrollmentController::class, 'store']
);

Route::put(
    '/enrollments/{enrollment}',
    [EnrollmentController::class, 'update']
);

Route::patch(
    '/enrollments/{enrollment}',
    [EnrollmentController::class, 'update']
);

Route::delete(
    '/enrollments/{enrollment}',
    [EnrollmentController::class, 'destroy']
);