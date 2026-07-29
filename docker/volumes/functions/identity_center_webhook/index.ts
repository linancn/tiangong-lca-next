import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { APP_CODE, applyActionToDesiredState } from '../_shared/identity_center.ts';
import {
  decideWebhookAction,
  verifyWebhookSignature,
  type WebhookEnvelope,
} from '../_shared/identity_center_core.ts';
import { supabaseServiceClient } from '../_shared/supabase_client.ts';

const SECRET = Deno.env.get('IDENTITY_CENTER_WEBHOOK_SECRET') ?? '';

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' });

  const rawBody = await req.text();
  const signature = req.headers.get('x-webhook-signature') ?? '';
  const timestamp = req.headers.get('x-webhook-timestamp') ?? '';
  const eventId = req.headers.get('x-webhook-event-id') ?? '';

  // 验签必须先于任何副作用(含库写入)——密钥缺失时不可静默放行,直接失败关闭。
  if (!SECRET) return json(500, { error: 'IDENTITY_CENTER_WEBHOOK_SECRET 未配置' });
  const verdict = await verifyWebhookSignature({ secret: SECRET, timestamp, rawBody, signature });
  if (!verdict.valid) return json(401, { error: verdict.reason });

  let envelope: WebhookEnvelope;
  try {
    envelope = JSON.parse(rawBody) as WebhookEnvelope;
  } catch {
    return json(200, { ok: true, ignored: 'unparseable body' }); // 验签已过:畸形体不重试
  }
  // 优先取已签名的 body 字段:eventId header 未被签名覆盖(仅 timestamp+rawBody 参与签名),
  // 而 envelope.eventId 是被签名保护的 rawBody 的一部分,伪造/篡改风险更低。
  const dedupeKey = envelope.eventId || eventId;
  if (!dedupeKey) return json(200, { ok: true, ignored: 'no event id' });

  // 幂等:event_id 主键,冲突即重复投递
  const { error: insertErr } = await supabaseServiceClient
    .from('identity_center_processed_events')
    .insert({ event_id: dedupeKey, event_type: envelope.eventType ?? 'unknown' });
  if (insertErr) {
    if (insertErr.code === '23505') return json(200, { ok: true, duplicate: true });
    return json(500, { error: insertErr.message }); // 库故障 → 让平台重试
  }

  try {
    const action = decideWebhookAction(envelope, APP_CODE);
    if (action.kind === 'ignore') {
      console.log(`[identity_center_webhook] ignore ${envelope.eventType}: ${action.reason}`);
      return json(200, { ok: true, ignored: action.reason });
    }
    await applyActionToDesiredState(supabaseServiceClient, action);
    return json(200, { ok: true });
  } catch (e) {
    // 处理失败:删除幂等记录以允许平台重试
    await supabaseServiceClient
      .from('identity_center_processed_events')
      .delete()
      .eq('event_id', dedupeKey);
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
