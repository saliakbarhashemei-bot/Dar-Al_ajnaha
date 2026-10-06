<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('short_description', 500)->nullable();
            $table->text('content')->nullable();
            $table->string('type');
            $table->string('status')->default('Draft');
            $table->foreignId('book_id')->nullable()->constrained('books')->restrictOnDelete();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->boolean('is_archived')->default(false);
            $table->softDeletes();
            $table->timestamps();

            $table->index('type');
            $table->index('status');
            $table->index('is_archived');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcements');
    }
};
