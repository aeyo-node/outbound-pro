import os
import boto3
from botocore.exceptions import NoCredentialsError

def get_supabase_settings():
    """Load settings from Supabase"""
    from dotenv import load_dotenv
    load_dotenv()
    
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_KEY", "")
    
    settings = {}
    if url and key:
        from supabase import create_client
        client = create_client(url, key)
        result = client.table("settings").select("key, value").execute()
        for row in (result.data or []):
            settings[row["key"]] = row["value"]
    return settings

def main():
    print("Fetching S3 settings from Supabase DB...")
    settings = get_supabase_settings()
    
    aws_key = settings.get("S3_ACCESS_KEY_ID") or settings.get("AWS_ACCESS_KEY_ID")
    aws_secret = settings.get("S3_SECRET_ACCESS_KEY") or settings.get("AWS_SECRET_ACCESS_KEY")
    aws_bucket = settings.get("S3_BUCKET") or settings.get("AWS_BUCKET_NAME")
    s3_endpoint = settings.get("S3_ENDPOINT_URL") or settings.get("S3_ENDPOINT")
    s3_region = settings.get("S3_REGION") or settings.get("AWS_REGION") or "ap-south-1"
    
    if not aws_key or not aws_secret or not aws_bucket:
        print("❌ Missing S3 Credentials in database!")
        print(f"Key: {'SET' if aws_key else 'MISSING'}")
        print(f"Secret: {'SET' if aws_secret else 'MISSING'}")
        print(f"Bucket: {'SET' if aws_bucket else 'MISSING'}")
        return

    print("✅ S3 Credentials found in database.")
    print(f"Bucket: {aws_bucket}")
    print(f"Region: {s3_region}")
    print(f"Endpoint: {s3_endpoint or 'AWS Default'}")
    
    try:
        print("Testing S3 connection by uploading a dummy file...")
        s3_client_kwargs = {
            "aws_access_key_id": aws_key,
            "aws_secret_access_key": aws_secret,
            "region_name": s3_region,
        }
        if s3_endpoint:
            s3_client_kwargs["endpoint_url"] = s3_endpoint
            
        s3 = boto3.client('s3', **s3_client_kwargs)
        
        # Test upload
        test_filename = "test_recording_upload.txt"
        with open(test_filename, "w") as f:
            f.write("This is a test upload for the Swaram Outbound Recording feature.")
            
        s3.upload_file(test_filename, aws_bucket, f"recordings/{test_filename}")
        print(f"✅ Successfully uploaded to: s3://{aws_bucket}/recordings/{test_filename}")
        
        # Clean up local file
        os.remove(test_filename)
        
    except NoCredentialsError:
        print("❌ Credentials error.")
    except Exception as e:
        print(f"❌ Failed to upload to S3: {e}")

if __name__ == "__main__":
    main()
