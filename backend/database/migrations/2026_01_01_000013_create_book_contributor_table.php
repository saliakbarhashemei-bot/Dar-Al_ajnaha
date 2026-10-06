<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('book_contributor', function (Blueprint $table) {
            $table->id();
            $table->foreignId('book_id')->constrained('books')->cascadeOnDelete();
            $table->foreignId('contributor_id')->constrained('contributors')->restrictOnDelete();
            $table->foreignId('contributor_role_id')->constrained('contributor_roles')->restrictOnDelete();
            $table->timestamps();

            $table->unique(['book_id', 'contributor_id', 'contributor_role_id'], 'book_contrib_unique');
            $table->index('book_id');
            $table->index('contributor_id');
            $table->index('contributor_role_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('book_contributor');
    }
};
