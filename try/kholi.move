module escrow::kholi {

    use sui::event;
    use sui::object::{new, uid_to_inner, delete};
    use sui::transfer::public_transfer;
    use sui::coin::{Coin, value, into_balance, from_balance};
    use sui::balance::Balance;

    /// Escrow object holding a token balance
    public struct Escrow<phantom T> has key, store {
        id: UID,
        maker: address,
        asset: Balance<T>,
        hashlock: vector<u8>,
        timelock: u64,
        claimed: bool,
        refunded: bool,
    }

    /// Event emitted when an escrow is created
    public struct EscrowCreated has copy, drop {
        escrow_id: ID,
        maker: address,
        amount: u64,
        hashlock: vector<u8>,
        timelock: u64,
    }

    /// Event emitted when an escrow is claimed
    public struct EscrowClaimed has copy, drop {
        escrow_id: ID,
        claimer: address,
    }

    /// Event emitted when an escrow is refunded
    public struct EscrowRefunded has copy, drop {
        escrow_id: ID,
        maker: address,
    }

    /// Create a new escrow
    public fun create_escrow<T>(
        maker: address,
        asset: Coin<T>,
        hashlock: vector<u8>,
        timelock: u64,
        ctx: &mut TxContext
    ): Escrow<T> {
        let id = new(ctx);
        let amount = value(&asset);
        let asset_balance = into_balance(asset);

        let escrow = Escrow {
            id,
            maker,
            asset: asset_balance,
            hashlock,
            timelock,
            claimed: false,
            refunded: false,
        };

        let escrow_id = uid_to_inner(&escrow.id);

        event::emit(EscrowCreated {
            escrow_id,
            maker,
            amount,
            hashlock,
            timelock,
        });

        escrow
    }

    public fun claim<T>(
        escrow: Escrow<T>,
        secret: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(!escrow.claimed, 0x1); // Escrow already claimed
        assert!(!escrow.refunded, 0x3); // Escrow already refunded
        assert!(escrow.hashlock == secret, 0x2); // Invalid secret

        // Destructure the escrow to move out all fields
        let Escrow { 
            id, 
            maker: _, 
            asset, 
            hashlock: _, 
            timelock: _, 
            claimed: _, 
            refunded: _ 
        } = escrow;

        let escrow_id = uid_to_inner(&id);
        let claimer = ctx.sender();
        
        // Convert balance back to coin and transfer to claimer
        let coin = from_balance(asset, ctx);
        public_transfer(coin, claimer);
        
        // Clean up the UID
        delete(id);

        event::emit(EscrowClaimed {
            escrow_id,
            claimer,
        });
    }

    public fun refund<T>(
        escrow: Escrow<T>,
        ctx: &mut TxContext,
    ) {
        assert!(!escrow.claimed && !escrow.refunded, 0x4);
        assert!(ctx.epoch() >= escrow.timelock, 0x5);
        assert!(ctx.sender() == escrow.maker, 0x6);

        // Destructure the escrow to move out all fields
        let Escrow { 
            id, 
            maker, 
            asset, 
            hashlock: _, 
            timelock: _, 
            claimed: _, 
            refunded: _ 
        } = escrow;

        let escrow_id = uid_to_inner(&id);
        
        // Convert balance back to coin and transfer to maker
        let coin = from_balance(asset, ctx);
        public_transfer(coin, maker);
        
        // Clean up the UID
        delete(id);

        event::emit(EscrowRefunded {
            escrow_id,
            maker,
        });
    }
}