<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('books', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('isbn')->nullable()->unique();
            $table->text('description')->nullable();
            $table->integer('page_count')->nullable();
            $table->string('language', 2)->nullable();
            $table->date('publication_date')->nullable();
            $table->string('publisher')->nullable();
            $table->string('edition', 64)->nullable();
            $table->string('status')->default('Draft');
            $table->foreignId('book_category_id')->nullable()->constrained('book_categories')->nullOnDelete();
            $table->string('genre', 128)->nullable();
            $table->boolean('is_archived')->default(false);
            $table->softDeletes();
            $table->timestamps();

            $table->index('status');
            $table->index('language');
            $table->index('is_archived');
        });

        DB::statement('ALTER TABLE books ADD CONSTRAINT books_page_count_non_negative CHECK (page_count IS NULL OR page_count >= 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('books');
    }
};
