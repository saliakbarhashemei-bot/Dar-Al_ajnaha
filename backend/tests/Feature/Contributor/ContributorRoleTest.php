<?php

use App\Models\User;

test('contributor-roles returns exactly 4 roles', function () {
    seedRolesAndPermissions();
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/v1/contributor-roles');

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(4);
});
