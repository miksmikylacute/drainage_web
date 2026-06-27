import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Supabase function environment is not configured.');
    }

    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: caller, error: callerError } = await userClient.auth.getUser();

    if (callerError || !caller.user) {
      return jsonResponse({ error: 'You must be signed in to delete a resident.' }, 401);
    }

    const { id } = await req.json();
    const residentId = `${id || ''}`.trim();

    if (!residentId) {
      return jsonResponse({ error: 'Resident id is required.' }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(residentId);

    if (deleteAuthError && !isMissingAuthUserError(deleteAuthError)) {
      throw deleteAuthError;
    }

    const { error: deleteResidentError } = await adminClient
      .from('residents')
      .delete()
      .eq('id', residentId);

    if (deleteResidentError) {
      throw deleteResidentError;
    }

    return jsonResponse({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete resident.';
    return jsonResponse({ error: message }, 500);
  }
});

function isMissingAuthUserError(error: { message?: string; status?: number }) {
  return error.status === 404 || `${error.message || ''}`.toLowerCase().includes('not found');
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
