<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media', function (Blueprint $table) {
            $table->id();
            $table->string('disk')->default('local');
            $table->string('path');
            $table->string('file_name');
            $table->string('mime_type');
            $table->bigInteger('size');
            $table->integer('width')->nullable();
            $table->integer('height')->nullable();
            $table->string('alt_text')->nullable();
            $table->string('caption')->nullable();
            $table->text('description')->nullable();
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->boolean('is_archived')->default(false);
            $table->softDeletes();
            $table->timestamps();

            $table->index('mime_type');
            $table->index('is_archived');
        });

        DB::statement('ALTER TABLE media ADD CONSTRAINT media_size_positive CHECK (size > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('media');
    }
};
