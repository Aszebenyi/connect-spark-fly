import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user with anon client
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to check admin status
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if user has admin role
    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: 'Access denied - Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all statistics using service role
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all users from auth.users via profiles (we can't query auth.users directly)
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Get all subscriptions
    const { data: subscriptions, error: subsError } = await adminClient
      .from('subscriptions')
      .select('*');

    // Get all leads
    const { data: leads, error: leadsError } = await adminClient
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    // Get all campaigns
    const { data: campaigns, error: campaignsError } = await adminClient
      .from('campaigns')
      .select('*');

    // Get all credit usage
    const { data: creditUsage, error: creditError } = await adminClient
      .from('credit_usage')
      .select('*')
      .order('created_at', { ascending: false });

    // Get all webset searches
    const { data: searches, error: searchesError } = await adminClient
      .from('webset_searches')
      .select('*')
      .order('created_at', { ascending: false });

    // Get all outreach messages with lead/campaign info
    const { data: outreachMessages, error: outreachError } = await adminClient
      .from('outreach_messages')
      .select('*, leads(name, email, user_id, company)')
      .order('created_at', { ascending: false });

    // Get all contact submissions
    const { data: contactSubmissions, error: contactError } = await adminClient
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    // Calculate metrics
    const totalUsers = profiles?.length || 0;
    const usersLast7Days = profiles?.filter(p => new Date(p.created_at) >= sevenDaysAgo).length || 0;
    const usersLast30Days = profiles?.filter(p => new Date(p.created_at) >= thirtyDaysAgo).length || 0;

    // Subscription breakdown
    const planCounts = {
      free: subscriptions?.filter(s => s.plan_id === 'free').length || 0,
      starter: subscriptions?.filter(s => s.plan_id === 'starter').length || 0,
      growth: subscriptions?.filter(s => s.plan_id === 'growth').length || 0,
      scale: subscriptions?.filter(s => s.plan_id === 'scale').length || 0,
    };

    // Calculate MRR (Monthly Recurring Revenue)
    const planPrices = { free: 0, starter: 35, growth: 99, scale: 199 };
    const mrr = (planCounts.starter * planPrices.starter) + 
                (planCounts.growth * planPrices.growth) + 
                (planCounts.scale * planPrices.scale);

    // Lead metrics
    const totalLeads = leads?.length || 0;
    const leadsLast7Days = leads?.filter(l => new Date(l.created_at) >= sevenDaysAgo).length || 0;
    const leadsLast30Days = leads?.filter(l => new Date(l.created_at) >= thirtyDaysAgo).length || 0;

    // Lead status breakdown
    const leadStatusCounts = {
      new: leads?.filter(l => l.status === 'new').length || 0,
      contacted: leads?.filter(l => l.status === 'contacted').length || 0,
      replied: leads?.filter(l => l.status === 'replied').length || 0,
      qualified: leads?.filter(l => l.status === 'qualified').length || 0,
      converted: leads?.filter(l => l.status === 'converted').length || 0,
    };

    // Campaign metrics
    const totalCampaigns = campaigns?.length || 0;
    const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;
    const draftCampaigns = campaigns?.filter(c => c.status === 'draft').length || 0;
    const totalEmailsSent = campaigns?.reduce((sum, c) => sum + (c.sent_count || 0), 0) || 0;
    const totalReplies = campaigns?.reduce((sum, c) => sum + (c.reply_count || 0), 0) || 0;

    // Credit metrics
    const totalCreditsUsed = subscriptions?.reduce((sum, s) => sum + (s.credits_used || 0), 0) || 0;
    const totalCreditsLimit = subscriptions?.reduce((sum, s) => sum + (s.credits_limit || 0), 0) || 0;
    const avgCreditsPerUser = totalUsers > 0 ? Math.round(totalCreditsUsed / totalUsers) : 0;

    // Search metrics
    const totalSearches = searches?.length || 0;
    const completedSearches = searches?.filter(s => s.status === 'completed').length || 0;
    const processingSearches = searches?.filter(s => s.status === 'processing').length || 0;

    // Outreach metrics
    const totalOutreachMessages = outreachMessages?.length || 0;
    const sentMessages = outreachMessages?.filter(m => m.status === 'sent').length || 0;
    const draftMessages = outreachMessages?.filter(m => m.status === 'draft').length || 0;

    // Daily signups for chart (last 30 days)
    const dailySignups: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailySignups[dateStr] = 0;
    }
    profiles?.forEach(p => {
      const dateStr = new Date(p.created_at).toISOString().split('T')[0];
      if (dailySignups[dateStr] !== undefined) {
        dailySignups[dateStr]++;
      }
    });

    // Daily leads for chart (last 30 days)
    const dailyLeads: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyLeads[dateStr] = 0;
    }
    leads?.forEach(l => {
      const dateStr = new Date(l.created_at).toISOString().split('T')[0];
      if (dailyLeads[dateStr] !== undefined) {
        dailyLeads[dateStr]++;
      }
    });

    // Daily credits for chart (last 30 days)
    const dailyCredits: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyCredits[dateStr] = 0;
    }
    creditUsage?.forEach(c => {
      const dateStr = new Date(c.created_at).toISOString().split('T')[0];
      if (dailyCredits[dateStr] !== undefined) {
        dailyCredits[dateStr] += c.credits_used || 0;
      }
    });

    // User details with subscription info
    const userDetails = profiles?.map(profile => {
      const userSub = subscriptions?.find(s => s.user_id === profile.user_id);
      const userLeads = leads?.filter(l => l.user_id === profile.user_id).length || 0;
      const userCampaigns = campaigns?.filter(c => c.user_id === profile.user_id).length || 0;
      
      return {
        id: profile.user_id,
        email: profile.email,
        fullName: profile.full_name,
        company: profile.company,
        createdAt: profile.created_at,
        plan: userSub?.plan_id || 'free',
        status: userSub?.status || 'active',
        creditsUsed: userSub?.credits_used || 0,
        creditsLimit: userSub?.credits_limit || 0,
        leadCount: userLeads,
        campaignCount: userCampaigns,
      };
    }) || [];

    // Recent activity
    const recentSignups = profiles?.slice(0, 10) || [];
    const recentLeads = leads?.slice(0, 10) || [];
    const recentSearches = searches?.slice(0, 10) || [];

    // Top users by leads
    const userLeadCounts = leads?.reduce((acc: Record<string, number>, lead) => {
      if (lead.user_id) {
        acc[lead.user_id] = (acc[lead.user_id] || 0) + 1;
      }
      return acc;
    }, {}) || {};

    const topUsersByLeads = Object.entries(userLeadCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([userId, count]) => {
        const profile = profiles?.find(p => p.user_id === userId);
        return {
          userId,
          email: profile?.email || 'Unknown',
          fullName: profile?.full_name,
          leadCount: count,
        };
      });

    const stats = {
      overview: {
        totalUsers,
        usersLast7Days,
        usersLast30Days,
        userGrowthRate: usersLast30Days > 0 ? Math.round((usersLast7Days / usersLast30Days) * 100) : 0,
        mrr,
        totalLeads,
        leadsLast7Days,
        leadsLast30Days,
        totalCampaigns,
        activeCampaigns,
        totalSearches,
        completedSearches,
      },
      subscriptions: {
        planCounts,
        paidUsers: planCounts.starter + planCounts.growth + planCounts.scale,
        conversionRate: totalUsers > 0 
          ? Math.round(((planCounts.starter + planCounts.growth + planCounts.scale) / totalUsers) * 100) 
          : 0,
      },
      leads: {
        total: totalLeads,
        statusCounts: leadStatusCounts,
        avgPerUser: totalUsers > 0 ? Math.round(totalLeads / totalUsers) : 0,
      },
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        draft: draftCampaigns,
        emailsSent: totalEmailsSent,
        replies: totalReplies,
        replyRate: totalEmailsSent > 0 ? Math.round((totalReplies / totalEmailsSent) * 100) : 0,
      },
      credits: {
        totalUsed: totalCreditsUsed,
        totalLimit: totalCreditsLimit,
        avgPerUser: avgCreditsPerUser,
        utilizationRate: totalCreditsLimit > 0 ? Math.round((totalCreditsUsed / totalCreditsLimit) * 100) : 0,
      },
      searches: {
        total: totalSearches,
        completed: completedSearches,
        processing: processingSearches,
      },
      outreach: {
        total: totalOutreachMessages,
        sent: sentMessages,
        draft: draftMessages,
        items: outreachMessages?.slice(0, 50) || [],
      },
      charts: {
        dailySignups: Object.entries(dailySignups).map(([date, count]) => ({ date, count })),
        dailyLeads: Object.entries(dailyLeads).map(([date, count]) => ({ date, count })),
        dailyCredits: Object.entries(dailyCredits).map(([date, count]) => ({ date, count })),
      },
      users: userDetails,
      recentActivity: {
        signups: recentSignups,
        leads: recentLeads,
        searches: recentSearches,
      },
      topUsers: {
        byLeads: topUsersByLeads,
      },
      contactSubmissions: {
        total: contactSubmissions?.length || 0,
        new: contactSubmissions?.filter(c => c.status === 'new').length || 0,
        items: contactSubmissions?.slice(0, 20) || [],
      },
      generatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
