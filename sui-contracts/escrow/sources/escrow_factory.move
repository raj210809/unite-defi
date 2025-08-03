module escrow::escrow_factory;
use escrow::escrow::{create_escrow , Escrow};
use sui::coin::Coin;

public fun create_escrow_instance<T>(
    maker: address,
    asset: Coin<T>,
    hashlock: vector<u8>,
    timelock: u64,
    ctx: &mut TxContext
): Escrow<T> {
    create_escrow(maker, asset, hashlock, timelock, ctx)
}
