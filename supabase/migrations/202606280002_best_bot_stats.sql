create table if not exists public.bot_stats (
    id uuid primary key default gen_random_uuid(),
    bot_id text not null unique,
    total_runs integer not null default 0,
    profits integer not null default 0,
    losses integer not null default 0,
    profit_amount numeric(15, 2) not null default 0,
    loss_amount numeric(15, 2) not null default 0,
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists bot_stats_rank_idx
    on public.bot_stats (profits desc, total_runs desc, updated_at desc);

alter table public.bot_stats enable row level security;

create or replace function public.touch_bot_stats_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := timezone('utc', now());
    return new;
end;
$$;

drop trigger if exists bot_stats_updated_at_trigger on public.bot_stats;
create trigger bot_stats_updated_at_trigger
before update on public.bot_stats
for each row
execute function public.touch_bot_stats_updated_at();

create or replace function public.get_best_bot_stats(limit_count integer default 20)
returns jsonb
language sql
security definer
set search_path = public
as $$
    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'bot_id', bot_id,
                'total_runs', total_runs,
                'profits', profits,
                'losses', losses,
                'profit_amount', profit_amount,
                'loss_amount', loss_amount,
                'win_rate',
                    case
                        when total_runs > 0 then round((profits::numeric / total_runs) * 100, 2)
                        else 0
                    end,
                'loss_rate',
                    case
                        when total_runs > 0 then round((losses::numeric / total_runs) * 100, 2)
                        else 0
                    end
            )
            order by profits desc, total_runs desc, updated_at desc
        ),
        '[]'::jsonb
    )
    from (
        select *
        from public.bot_stats
        order by profits desc, total_runs desc, updated_at desc
        limit greatest(coalesce(limit_count, 20), 1)
    ) ranked_bot_stats;
$$;

create or replace function public.get_best_bot_stat(target_bot_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    bot_record public.bot_stats%rowtype;
begin
    select *
    into bot_record
    from public.bot_stats
    where bot_id = target_bot_id
    limit 1;

    if not found then
        raise exception 'Bot stats not found.' using errcode = 'P0001';
    end if;

    return jsonb_build_object(
        'bot_id', bot_record.bot_id,
        'total_runs', bot_record.total_runs,
        'profits', bot_record.profits,
        'losses', bot_record.losses,
        'profit_amount', bot_record.profit_amount,
        'loss_amount', bot_record.loss_amount,
        'win_rate',
            case
                when bot_record.total_runs > 0 then round((bot_record.profits::numeric / bot_record.total_runs) * 100, 2)
                else 0
            end,
        'loss_rate',
            case
                when bot_record.total_runs > 0 then round((bot_record.losses::numeric / bot_record.total_runs) * 100, 2)
                else 0
            end
    );
end;
$$;

create or replace function public.upsert_best_bot_stat(
    target_bot_id text,
    target_total_runs integer default 0,
    target_profits integer default 0,
    target_losses integer default 0,
    target_profit_amount numeric default 0,
    target_loss_amount numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    bot_record public.bot_stats%rowtype;
begin
    insert into public.bot_stats (
        bot_id,
        total_runs,
        profits,
        losses,
        profit_amount,
        loss_amount
    )
    values (
        target_bot_id,
        greatest(coalesce(target_total_runs, 0), 0),
        greatest(coalesce(target_profits, 0), 0),
        greatest(coalesce(target_losses, 0), 0),
        coalesce(target_profit_amount, 0),
        coalesce(target_loss_amount, 0)
    )
    on conflict (bot_id) do update
    set
        total_runs = excluded.total_runs,
        profits = excluded.profits,
        losses = excluded.losses,
        profit_amount = excluded.profit_amount,
        loss_amount = excluded.loss_amount
    returning *
    into bot_record;

    return jsonb_build_object(
        'bot_id', bot_record.bot_id,
        'total_runs', bot_record.total_runs,
        'profits', bot_record.profits,
        'losses', bot_record.losses,
        'profit_amount', bot_record.profit_amount,
        'loss_amount', bot_record.loss_amount,
        'win_rate',
            case
                when bot_record.total_runs > 0 then round((bot_record.profits::numeric / bot_record.total_runs) * 100, 2)
                else 0
            end,
        'loss_rate',
            case
                when bot_record.total_runs > 0 then round((bot_record.losses::numeric / bot_record.total_runs) * 100, 2)
                else 0
            end
    );
end;
$$;
