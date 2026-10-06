<?php

use App\Http\Controllers\Announcement\AnnouncementController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Book\BookCategoryController;
use App\Http\Controllers\Book\BookContributorController;
use App\Http\Controllers\Book\BookController;
use App\Http\Controllers\Book\TagController;
use App\Http\Controllers\Contributor\ContributorController;
use App\Http\Controllers\Contributor\ContributorRoleController;
use App\Http\Controllers\Media\MediaAttachmentController;
use App\Http\Controllers\Media\MediaController;
use App\Http\Controllers\Media\MediaTypeController;
use App\Http\Controllers\Profile\ProfileController;
use App\Http\Controllers\Role\PermissionController;
use App\Http\Controllers\Role\RoleController;
use App\Http\Controllers\User\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));

Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me/password', [ProfileController::class, 'updatePassword']);

    Route::apiResource('users', UserController::class);
    Route::post('users/{user}/disable', [UserController::class, 'disable']);
    Route::put('users/{user}/roles', [UserController::class, 'updateRoles']);

    Route::apiResource('roles', RoleController::class);
    Route::put('roles/{role}/permissions', [RoleController::class, 'updatePermissions']);

    Route::apiResource('permissions', PermissionController::class)->only(['index', 'show']);

    Route::apiResource('contributors', ContributorController::class);
    Route::post('contributors/{contributor}/archive', [ContributorController::class, 'archive']);
    Route::get('contributor-roles', [ContributorRoleController::class, 'index']);

    Route::apiResource('books', BookController::class);
    Route::post('books/{book}/archive', [BookController::class, 'archive']);
    Route::post('books/{book}/contributors', [BookContributorController::class, 'attach']);
    Route::get('books/{book}/contributors', [BookContributorController::class, 'index']);
    Route::put('books/{book}/contributors/{contributor}', [BookContributorController::class, 'update']);
    Route::delete('books/{book}/contributors/{contributor}', [BookContributorController::class, 'detach']);
    Route::apiResource('book-categories', BookCategoryController::class)->only(['index', 'store', 'update', 'destroy'])->parameters(['book-categories' => 'bookCategory']);
    Route::apiResource('tags', TagController::class)->only(['index', 'store', 'destroy']);

    Route::post('media', [MediaController::class, 'store'])->middleware('throttle:30,1');
    Route::apiResource('media', MediaController::class)->except(['store'])->parameters(['media' => 'media']);
    Route::post('media/{media}/replace', [MediaController::class, 'replace'])->middleware('throttle:30,1');
    Route::post('media/{media}/archive', [MediaController::class, 'archive']);
    Route::get('media/{media}/attachments', [MediaController::class, 'attachments']);
    Route::get('media/{media}/file', [MediaController::class, 'file'])->name('media.file');

    Route::post('books/{book}/media', [MediaAttachmentController::class, 'bookAttach']);
    Route::get('books/{book}/media', [MediaAttachmentController::class, 'bookIndex']);
    Route::delete('books/{book}/media/{media}', [MediaAttachmentController::class, 'bookDetach']);

    Route::post('contributors/{contributor}/media', [MediaAttachmentController::class, 'contributorAttach']);
    Route::get('contributors/{contributor}/media', [MediaAttachmentController::class, 'contributorIndex']);
    Route::delete('contributors/{contributor}/media/{media}', [MediaAttachmentController::class, 'contributorDetach']);

    Route::post('announcements/{announcement}/media', [MediaAttachmentController::class, 'announcementAttach']);
    Route::get('announcements/{announcement}/media', [MediaAttachmentController::class, 'announcementIndex']);
    Route::delete('announcements/{announcement}/media/{media}', [MediaAttachmentController::class, 'announcementDetach']);

    Route::get('media-types', [MediaTypeController::class, 'index']);

    Route::apiResource('announcements', AnnouncementController::class);
    Route::post('announcements/{announcement}/archive', [AnnouncementController::class, 'archive']);
});
