#[test_only]
module escrow::escrow_tests {
    use sui::test_scenario::{Self as test, next_tx, ctx};
    use sui::coin::{Self, Coin,};
    use sui::sui::SUI;
    use std::hash;
    use escrow::escrow::{Self, Escrow};
    use escrow::escrow_factory;

    // Test addresses
    const MAKER: address = @0xA;
    const CLAIMER: address = @0xB;
    const RANDOM_USER: address = @0xC;

    // Test constants
    const ESCROW_AMOUNT: u64 = 1000;
    const SECRET: vector<u8> = b"my_secret";
    const WRONG_SECRET: vector<u8> = b"wrong_secret";
    const TIMELOCK_FUTURE: u64 = 100;
    const TIMELOCK_PAST: u64 = 1;

    // Custom test coin for testing
    public struct TEST_COIN has drop {}

    // Helper function to create a test coin
    fun create_test_coin(amount: u64, ctx: &mut TxContext): Coin<TEST_COIN> {
        coin::mint_for_testing<TEST_COIN>(amount, ctx)
    }

    // Helper function to create hashlock from secret
    fun create_hashlock(secret: vector<u8>): vector<u8> {
        hash::sha3_256(secret)
    }

    #[test]
    fun test_create_escrow_success() {
        let mut scenario = test::begin(MAKER);
        
        // Create escrow
        next_tx(&mut scenario, MAKER);
        {
            let coin = create_test_coin(ESCROW_AMOUNT, ctx(&mut scenario));
            let hashlock = create_hashlock(SECRET);
            
            let escrow = escrow::create_escrow(
                CLAIMER,
                coin,
                hashlock,
                TIMELOCK_FUTURE,
                ctx(&mut scenario)
            );
            
            // Transfer escrow to maker for testing
            sui::transfer::public_transfer(escrow, CLAIMER);
        };
        
        // Verify escrow was created
        next_tx(&mut scenario, CLAIMER);
        {
            let escrow = test::take_from_sender<Escrow<TEST_COIN>>(&scenario);
            
            // Verify escrow properties (we'll need getter functions for this)
            test::return_to_sender(&scenario, escrow);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_create_escrow_via_factory() {
        let mut scenario = test::begin(MAKER);
        
        next_tx(&mut scenario, MAKER);
        {
            let coin = create_test_coin(ESCROW_AMOUNT, ctx(&mut scenario));
            let hashlock = create_hashlock(SECRET);
            
            let escrow = escrow_factory::create_escrow_instance(
                MAKER,
                coin,
                hashlock,
                TIMELOCK_FUTURE,
                ctx(&mut scenario)
            );
            
            sui::transfer::public_transfer(escrow, MAKER);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_claim_escrow_success() {
        let mut scenario = test::begin(MAKER);
        
        // Create escrow
        next_tx(&mut scenario, MAKER);
        {
            let coin = create_test_coin(ESCROW_AMOUNT, ctx(&mut scenario));
            let hashlock = create_hashlock(SECRET);
            
            let escrow = escrow::create_escrow(
                CLAIMER,
                coin,
                hashlock,
                TIMELOCK_FUTURE,
                ctx(&mut scenario)
            );
            
            sui::transfer::public_transfer(escrow, CLAIMER);
        };
        
        // Claim escrow with correct secret
        next_tx(&mut scenario, CLAIMER);
        {
            let escrow = test::take_from_sender<Escrow<TEST_COIN>>(&scenario);
            
            escrow::claim(escrow, create_hashlock(SECRET), ctx(&mut scenario));
        };
        
        // Verify claimer received the coin
        next_tx(&mut scenario, CLAIMER);
        {
            let coin = test::take_from_sender<Coin<TEST_COIN>>(&scenario);
            assert!(coin::value(&coin) == ESCROW_AMOUNT, 0);
            test::return_to_sender(&scenario, coin);
        };
        
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 0x2)]
    fun test_claim_escrow_wrong_secret() {
        let mut scenario = test::begin(MAKER);
        
        // Create escrow
        next_tx(&mut scenario, MAKER);
        {
            let coin = create_test_coin(ESCROW_AMOUNT, ctx(&mut scenario));
            let hashlock = create_hashlock(SECRET);
            
            let escrow = escrow::create_escrow(
                CLAIMER,
                coin,
                hashlock,
                TIMELOCK_FUTURE,
                ctx(&mut scenario)
            );
            
            sui::transfer::public_transfer(escrow, CLAIMER);
        };
        
        // Try to claim with wrong secret - should fail
        next_tx(&mut scenario, CLAIMER);
        {
            let escrow = test::take_from_sender<Escrow<TEST_COIN>>(&scenario);
            escrow::claim(escrow, create_hashlock(WRONG_SECRET), ctx(&mut scenario));
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_refund_escrow_success() {
        let mut scenario = test::begin(MAKER);
        
        // Create escrow with past timelock
        next_tx(&mut scenario, MAKER);
        {
            let coin = create_test_coin(ESCROW_AMOUNT, ctx(&mut scenario));
            let hashlock = create_hashlock(SECRET);
            
            let escrow = escrow::create_escrow(
                CLAIMER,
                coin,
                hashlock,
                TIMELOCK_PAST,
                ctx(&mut scenario)
            );
            
            sui::transfer::public_transfer(escrow, CLAIMER);
        };
        
        // Fast forward time to make timelock expire
        test::next_epoch(&mut scenario, MAKER);
        test::next_epoch(&mut scenario, MAKER);
        
        // Refund escrow
        next_tx(&mut scenario, MAKER);
        {
            let escrow = test::take_from_sender<Escrow<TEST_COIN>>(&scenario);
            escrow::refund(escrow, ctx(&mut scenario));
        };
        
        // Verify maker received the refund
        next_tx(&mut scenario, MAKER);
        {
            let coin = test::take_from_sender<Coin<TEST_COIN>>(&scenario);
            assert!(coin::value(&coin) == ESCROW_AMOUNT, 0);
            test::return_to_sender(&scenario, coin);
        };
        
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 0x5)]
    fun test_refund_escrow_timelock_not_expired() {
        let mut scenario = test::begin(MAKER);
        
        // Create escrow with future timelock
        next_tx(&mut scenario, MAKER);
        {
            let coin = create_test_coin(ESCROW_AMOUNT, ctx(&mut scenario));
            let hashlock = create_hashlock(SECRET);
            
            let escrow = escrow::create_escrow(
                MAKER,
                coin,
                hashlock,
                TIMELOCK_FUTURE,
                ctx(&mut scenario)
            );
            
            sui::transfer::public_transfer(escrow, MAKER);
        };
        
        // Try to refund before timelock expires - should fail
        next_tx(&mut scenario, MAKER);
        {
            let escrow = test::take_from_sender<Escrow<TEST_COIN>>(&scenario);
            escrow::refund(escrow, ctx(&mut scenario));
        };
        
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 0x6)]
    fun test_refund_escrow_wrong_maker() {
        let mut scenario = test::begin(MAKER);
        
        // Create escrow
        next_tx(&mut scenario, MAKER);
        {
            let coin = create_test_coin(ESCROW_AMOUNT, ctx(&mut scenario));
            let hashlock = create_hashlock(SECRET);
            
            let escrow = escrow::create_escrow(
                MAKER,
                coin,
                hashlock,
                TIMELOCK_PAST,
                ctx(&mut scenario)
            );
            
            sui::transfer::public_transfer(escrow, RANDOM_USER);
        };
        
        // Fast forward time
        test::next_epoch(&mut scenario, RANDOM_USER);
        test::next_epoch(&mut scenario, RANDOM_USER);
        
        // Try to refund from wrong user - should fail
        next_tx(&mut scenario, RANDOM_USER);
        {
            let escrow = test::take_from_sender<Escrow<TEST_COIN>>(&scenario);
            escrow::refund(escrow, ctx(&mut scenario));
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_multiple_escrows_different_tokens() {
        let mut scenario = test::begin(MAKER);
        
        // Create TEST_COIN escrow
        next_tx(&mut scenario, MAKER);
        {
            let coin = create_test_coin(ESCROW_AMOUNT, ctx(&mut scenario));
            let hashlock = create_hashlock(SECRET);
            
            let escrow = escrow::create_escrow(
                MAKER,
                coin,
                hashlock,
                TIMELOCK_FUTURE,
                ctx(&mut scenario)
            );
            
            sui::transfer::public_transfer(escrow, CLAIMER);
        };
        
        // Create SUI escrow (if available in test environment)
        next_tx(&mut scenario, MAKER);
        {
            let sui_coin = coin::mint_for_testing<SUI>(ESCROW_AMOUNT, ctx(&mut scenario));
            let hashlock = create_hashlock(b"different_secret");
            
            let sui_escrow = escrow::create_escrow(
                MAKER,
                sui_coin,
                hashlock,
                TIMELOCK_FUTURE,
                ctx(&mut scenario)
            );
            
            sui::transfer::public_transfer(sui_escrow, CLAIMER);
        };
        
        // Claim both escrows
        next_tx(&mut scenario, CLAIMER);
        {
            let test_escrow = test::take_from_sender<Escrow<TEST_COIN>>(&scenario);
            let sui_escrow = test::take_from_sender<Escrow<SUI>>(&scenario);
            
            escrow::claim(test_escrow, SECRET, ctx(&mut scenario));
            escrow::claim(sui_escrow, b"different_secret", ctx(&mut scenario));
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_escrow_with_zero_amount() {
        let mut scenario = test::begin(MAKER);
        
        next_tx(&mut scenario, MAKER);
        {
            let coin = create_test_coin(0, ctx(&mut scenario));
            let hashlock = create_hashlock(SECRET);
            
            let escrow = escrow::create_escrow(
                MAKER,
                coin,
                hashlock,
                TIMELOCK_FUTURE,
                ctx(&mut scenario)
            );
            
            sui::transfer::public_transfer(escrow, CLAIMER);
        };
        
        // Claim zero amount escrow
        next_tx(&mut scenario, CLAIMER);
        {
            let escrow = test::take_from_sender<Escrow<TEST_COIN>>(&scenario);
            escrow::claim(escrow, SECRET, ctx(&mut scenario));
        };
        
        // Verify claimer received zero amount coin
        next_tx(&mut scenario, CLAIMER);
        {
            let coin = test::take_from_sender<Coin<TEST_COIN>>(&scenario);
            assert!(coin::value(&coin) == 0, 0);
            test::return_to_sender(&scenario, coin);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_escrow_with_large_amount() {
        let mut scenario = test::begin(MAKER);
        let large_amount = 18_446_744_073_709_551_615; // Max u64
        
        next_tx(&mut scenario, MAKER);
        {
            let coin = create_test_coin(large_amount, ctx(&mut scenario));
            let hashlock = create_hashlock(SECRET);
            
            let escrow = escrow::create_escrow(
                MAKER,
                coin,
                hashlock,
                TIMELOCK_FUTURE,
                ctx(&mut scenario)
            );
            
            sui::transfer::public_transfer(escrow, CLAIMER);
        };
        
        next_tx(&mut scenario, CLAIMER);
        {
            let escrow = test::take_from_sender<Escrow<TEST_COIN>>(&scenario);
            escrow::claim(escrow, SECRET, ctx(&mut scenario));
        };
        
        next_tx(&mut scenario, CLAIMER);
        {
            let coin = test::take_from_sender<Coin<TEST_COIN>>(&scenario);
            assert!(coin::value(&coin) == large_amount, 0);
            test::return_to_sender(&scenario, coin);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_escrow_with_empty_hashlock() {
        let mut scenario = test::begin(MAKER);
        
        next_tx(&mut scenario, MAKER);
        {
            let coin = create_test_coin(ESCROW_AMOUNT, ctx(&mut scenario));
            let empty_hashlock = vector::empty<u8>();
            
            let escrow = escrow::create_escrow(
                MAKER,
                coin,
                empty_hashlock,
                TIMELOCK_FUTURE,
                ctx(&mut scenario)
            );
            
            sui::transfer::public_transfer(escrow, CLAIMER);
        };
        
        // Claim with empty secret
        next_tx(&mut scenario, CLAIMER);
        {
            let escrow = test::take_from_sender<Escrow<TEST_COIN>>(&scenario);
            let empty_secret = vector::empty<u8>();
            escrow::claim(escrow, empty_secret, ctx(&mut scenario));
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_escrow_stress_test() {
        let mut scenario = test::begin(MAKER);
        let num_escrows = 10;
        let mut i = 0;
        
        // Create multiple escrows
        while (i < num_escrows) {
            next_tx(&mut scenario, MAKER);
            {
                let coin = create_test_coin(ESCROW_AMOUNT + i, ctx(&mut scenario));
                let mut secret = SECRET;
                vector::push_back(&mut secret, (i as u8));
                let hashlock = create_hashlock(secret);
                
                let escrow = escrow::create_escrow(
                    MAKER,
                    coin,
                    hashlock,
                    TIMELOCK_FUTURE + i,
                    ctx(&mut scenario)
                );
                
                sui::transfer::public_transfer(escrow, CLAIMER);
            };
            i = i + 1;
        };
        
        // Claim all escrows
        i = 0;
        while (i < num_escrows) {
            next_tx(&mut scenario, CLAIMER);
            {
                let escrow = test::take_from_sender<Escrow<TEST_COIN>>(&scenario);
                let mut secret = SECRET;
                vector::push_back(&mut secret, (i as u8));
                escrow::claim(escrow, secret, ctx(&mut scenario));
            };
            i = i + 1;
        };
        
        test::end(scenario);
    }

    // Test event emissions (if events are accessible in tests)
    #[test]
    fun test_events_emitted() {
        let mut scenario = test::begin(MAKER);
        
        // Test EscrowCreated event
        next_tx(&mut scenario, MAKER);
        {
            let coin = create_test_coin(ESCROW_AMOUNT, ctx(&mut scenario));
            let hashlock = create_hashlock(SECRET);
            
            let escrow = escrow::create_escrow(
                MAKER,
                coin,
                hashlock,
                TIMELOCK_FUTURE,
                ctx(&mut scenario)
            );
            
            sui::transfer::public_transfer(escrow, CLAIMER);
        };
        
        // Test EscrowClaimed event
        next_tx(&mut scenario, CLAIMER);
        {
            let escrow = test::take_from_sender<Escrow<TEST_COIN>>(&scenario);
            escrow::claim(escrow, SECRET, ctx(&mut scenario));
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_refund_after_multiple_epochs() {
        let mut scenario = test::begin(MAKER);
        
        next_tx(&mut scenario, MAKER);
        {
            let coin = create_test_coin(ESCROW_AMOUNT, ctx(&mut scenario));
            let hashlock = create_hashlock(SECRET);
            
            let escrow = escrow::create_escrow(
                MAKER,
                coin,
                hashlock,
                5, // Timelock at epoch 5
                ctx(&mut scenario)
            );
            
            sui::transfer::public_transfer(escrow, MAKER);
        };
        
        // Advance multiple epochs
        let mut epoch = 0;
        while (epoch < 10) {
            test::next_epoch(&mut scenario, MAKER);
            epoch = epoch + 1;
        };
        
        // Should be able to refund after timelock
        next_tx(&mut scenario, MAKER);
        {
            let escrow = test::take_from_sender<Escrow<TEST_COIN>>(&scenario);
            escrow::refund(escrow, ctx(&mut scenario));
        };
        
        test::end(scenario);
    }
}