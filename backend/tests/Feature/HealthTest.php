<?php

test('health endpoint returns ok', function () {
    $this->get('/api/v1/health')->assertOk()->assertJson(['status' => 'ok']);
});
