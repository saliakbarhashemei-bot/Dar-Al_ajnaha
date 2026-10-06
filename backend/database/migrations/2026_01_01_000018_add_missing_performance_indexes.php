<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Phase 7 hardening gap-fix: two indexes missed in earlier migrations.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contributors', function (Blueprint $table) {
            $table->index('is_archived');
        });

        Schema::table('activity_log', function (Blueprint $table) {
            $table->index('actor_id');
        });
    }

    public function down(): void
    {
        Schema::table('activity_log', function (Blueprint $table) {
            $table->dropIndex(['actor_id']);
        });

        Schema::table('contributors', function (Blueprint $table) {
            $table->dropIndex(['is_archived']);
        });
    }
};
