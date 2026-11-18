-- De nieuwsrun vanuit Supabase starten (2026-11-18).
--
-- GitHub sloeg geplande runs over (17 november, 12:17) of begon ze uren later
-- (18 november: 07:37 in plaats van 00:17). pg_cron is wel op tijd: om 00:17 en
-- 12:17 UTC start deze taak de Action "update-news.yml" via workflow_dispatch.
-- De cron in de workflow blijft als reserve en slaat over als deze dispatch er
-- al was.
--
-- Nodig: een Vault-secret `github_actions_token` (fine-grained token, alleen
-- de repo Brightnews.online, Actions: read and write). Zonder die secret doet
-- de taak niets. GitHub antwoordt met 204; kijk na in net._http_response.

select cron.schedule('nieuwsrun-starten', '17 0,12 * * *',
    $$select net.http_post(
        url := 'https://api.github.com/repos/MaartenDeKlerkPXL/Brightnews.online/actions/workflows/update-news.yml/dispatches',
        headers := jsonb_build_object(
            'Accept', 'application/vnd.github+json',
            'Authorization', 'Bearer ' || decrypted_secret,
            'X-GitHub-Api-Version', '2022-11-28',
            'User-Agent', 'brightnews-pg-cron',
            'Content-Type', 'application/json'),
        body := '{"ref":"master"}'::jsonb)
      from vault.decrypted_secrets where name = 'github_actions_token'$$);
