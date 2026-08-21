#!/usr/bin/env python3
"""Direct test to insert data into Supabase."""

import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Set environment variables
os.environ["SUPABASE_URL"] = "https://rddkgfgzrzrkwxlijmnd.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkZGtnZmd6cnpya3d4bGlqbW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk5NTU1MSwiZXhwIjoyMTAxNTcxNTUxfQ.sAgZ5K3O2G4YxyaLWp8oxss5_ZOUDmrlA7LH2avDmhU"

print("=" * 60)
print("SUPABASE DATABASE INSERT TEST")
print("=" * 60)

try:
    # Import after setting env vars
    from app.db.supabase_client import get_supabase
    from app.db.crud import save_analysis
    
    print("\n1. Testing Supabase client initialization...")
    supabase = get_supabase()
    
    if supabase is None:
        print("❌ FAILED: Supabase client is None")
        print("   Check if supabase-py is installed: pip install supabase")
        sys.exit(1)
    else:
        print("✅ SUCCESS: Supabase client initialized")
    
    print("\n2. Testing table access...")
    try:
        result = supabase.table("analysis_sessions").select("count", count="exact").execute()
        print(f"✅ SUCCESS: Table 'analysis_sessions' exists with {result.count} rows")
    except Exception as e:
        print(f"❌ FAILED: Cannot access table: {e}")
        sys.exit(1)
    
    print("\n3. Testing insert operation...")
    test_data = {
        "repo_path": "https://github.com/test/test-repo",
        "query": "test query",
        "agents_run": ["explorer", "trace"],
        "statuses": {"explorer": "success", "trace": "success"},
        "executive_summary": "Test executive summary",
        "explorer": "Test explorer result",
        "trace": {"timeline": "test timeline", "summary": "test summary"},
        "security": None,
        "visualization": None,
    }
    
    try:
        save_analysis("test_user_123", test_data)
        print("✅ SUCCESS: save_analysis() completed without errors")
    except Exception as e:
        print(f"❌ FAILED: save_analysis() threw exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    print("\n4. Verifying data was inserted...")
    try:
        result = supabase.table("analysis_sessions").select("*").eq("repo_url", "https://github.com/test/test-repo").execute()
        if result.data and len(result.data) > 0:
            print(f"✅ SUCCESS: Found {len(result.data)} record(s) for test-repo")
            print(f"   Latest record: repo_url={result.data[0].get('repo_url')}")
        else:
            print("❌ FAILED: No data found after insert")
            sys.exit(1)
    except Exception as e:
        print(f"❌ FAILED: Could not verify insert: {e}")
        sys.exit(1)
    
    print("\n5. Testing chat_history table...")
    try:
        result = supabase.table("chat_history").select("count", count="exact").execute()
        print(f"✅ SUCCESS: Table 'chat_history' exists with {result.count} rows")
    except Exception as e:
        print(f"⚠️  WARNING: chat_history table issue: {e}")
    
    print("\n" + "=" * 60)
    print("ALL TESTS PASSED! ✅")
    print("=" * 60)
    print("\nSupabase is working correctly. The issue must be:")
    print("1. save_analysis() is not being called in the actual flow")
    print("2. An exception is being silently caught somewhere")
    print("3. The backend server is not using these updated files")
    
except ImportError as e:
    print(f"\n❌ IMPORT ERROR: {e}")
    print("\nMake sure you have installed required packages:")
    print("  cd backend")
    print("  pip install -r requirements.txt")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ UNEXPECTED ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
