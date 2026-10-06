<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Phase 7 hardening gap-fix: indexes on filtered/joined foreign keys that
// PostgreSQL does not create automatically. `constrained()` adds a foreign key
// constraint but no index, so each of these was a sequential scan.
return new class extends Migration
{
    public function up(): void
    {
        // Filtered on every announcement list request.
        Schema::table('announcements', function (Blueprint $table) {
            $table->index('book_id');
        });

        // Filtered on every book list request.
        Schema::table('books', function (Blueprint $table) {
            $table->index('book_category_id');
        });

        // Leading column for the permission join in User::permissions().
        Schema::table('role_user', function (Blueprint $table) {
            $table->index('user_id');
        });

        // Backs Role::permissions() and the role-change cache fan-out.
        Schema::table('permission_role', function (Blueprint $table) {
            $table->index('role_id');
        });

        Schema::table('media', function (Blueprint $table) {
            $table->index('uploaded_by');
        });

        // Reverse direction of the book_tag primary key.
        Schema::table('book_tag', function (Blueprint $table) {
            $table->index('tag_id');
        });
    }

    public function down(): void
    {
        Schema::table('book_tag', function (Blueprint $table) {
            $table->dropIndex(['tag_id']);
        });

        Schema::table('media', function (Blueprint $table) {
            $table->dropIndex(['uploaded_by']);
        });

        Schema::table('permission_role', function (Blueprint $table) {
            $table->dropIndex(['role_id']);
        });

        Schema::table('role_user', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
        });

        Schema::table('books', function (Blueprint $table) {
            $table->dropIndex(['book_category_id']);
        });

        Schema::table('announcements', function (Blueprint $table) {
            $table->dropIndex(['book_id']);
        });
    }
};
