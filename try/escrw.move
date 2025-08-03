module escrow::escrw {

    use sui::event;
    use sui::object::{new, uid_to_inner};
    use sui::transfer::public_transfer;
    use sui::coin::{Coin , value , from_balance};
    use sui::balance::Balance;
    use sui::balance;
    use sui::balance::value;

    /// Escrow object holding a token balance
    public struct Escrow<phantom T> has key, store  {
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
        escrow_id: ID, // ✅ Correct type
        maker: address,
        amount: u64,
        hashlock: vector<u8>,
        timelock: u64,
    }

    /// Create a new escrow
    public fun create_escrow<T>(
        maker: address,
        asset: Balance<T>,
        hashlock: vector<u8>,
        timelock: u64,
        ctx: &mut TxContext
    ): Escrow<T> {
        let id = new(ctx);
        let amount = value(&asset);

        let escrow = Escrow {
            id,
            maker,
            asset,
            hashlock,
            timelock,
            claimed: false,
            refunded: false,
        };

        let escrow_id = uid_to_inner(&escrow.id); // ✅ Converts UID to address

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
        escrow: &mut Escrow<T>,
        secret: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(escrow.claimed == false, 0x1); // Escrow already claimed
        assert!(escrow.hashlock == secret, 0x2); // Invalid secret

        escrow.claimed = true;

    }

    public fun refund<T>(
        escrow: &mut Escrow<T>,
        ctx: &mut TxContext,
    ) {
        assert!(!escrow.claimed && !escrow.refunded, 0x4);
        assert!(ctx.epoch() >= escrow.timelock, 0x5);
        assert!(ctx.sender() == escrow.maker, 0x6);

        escrow.refunded = true;

        let coin = from_balance(escrow.asset , ctx)

        public_transfer(coin, escrow.maker)
    }
}