<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mediables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('media_id')->constrained('media')->cascadeOnDelete();
            $table->string('mediable_type');
            $table->unsignedBigInteger('mediable_id');
            $table->string('media_type');
            $table->timestamps();

            $table->unique(['media_id', 'mediable_type', 'mediable_id', 'media_type'], 'mediables_unique');
            $table->index(['mediable_type', 'mediable_id']);
            $table->index('media_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mediables');
    }
};
