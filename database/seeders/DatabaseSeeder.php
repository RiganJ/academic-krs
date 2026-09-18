<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        Artisan::call('academic:seed', [
            '--count' => 5000000,
            '--courses' => 200,
        ]);

        $this->command?->getOutput()->write(
            Artisan::output()
        );
    }
}
