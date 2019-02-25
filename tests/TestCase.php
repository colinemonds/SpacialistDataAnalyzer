<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;

use App\User;

use Tymon\JWTAuth\Facades\JWTAuth;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;
    use DatabaseTransactions;

    protected $connectionsToTransact = [
        'pgsql'
    ];

    public $user = null;
    public $token = null;

    protected function setUp()
    {
        parent::setUp();
        $this->user = null;
        $this->token = null;
        $this->getUserToken();
    }

    public function getUserToken() {
        if(!isset($this->user)) {
            $this->user = User::find(1);
        }
        $this->token = JWTAuth::fromUser($this->user);
    }

    public function getUnauthUser() {
        if(!isset($this->user)) {
            $this->user = User::find(1);
        }
        return $this->user;
    }
}
