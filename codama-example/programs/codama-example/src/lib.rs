use anchor_lang::prelude::*;

declare_id!("4E3SU5smmBdz1Vq7MJCSQAqor5ggP9a3D1KzSvEaXoMw");

#[program]
pub mod codama_example {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, desc: String, count: u8) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);

        ctx.accounts.data_account.set_inner(DataAccount {
            desc,
            count,
            bump: ctx.bumps.data_account,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + DataAccount::INIT_SPACE,
        seeds=[b"data".as_ref(), admin.key().as_ref()],
        bump
    )]
    pub data_account: Account<'info, DataAccount>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct DataAccount {
    #[max_len(200)]
    pub desc: String,
    pub count: u8,
    pub bump: u8,
}
