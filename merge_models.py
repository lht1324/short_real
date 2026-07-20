import csv
import json

def parse_image_price(line):
    parts = line.strip().split('/')
    prices = []
    if len(parts) >= 1 and parts[0]:
        prices.append({"unit": "image_720p", "price_per_unit": float(parts[0])})
    if len(parts) >= 2 and parts[1]:
        prices.append({"unit": "image_1080p", "price_per_unit": float(parts[1])})
    return prices

def parse_video_price(line):
    parts = line.strip().split('/')
    prices = []
    durations = []
    
    if len(parts) >= 1 and parts[0]:
        prices.append({"unit": "video_720p", "price_per_unit": float(parts[0])})
    if len(parts) >= 2 and parts[1]:
        prices.append({"unit": "video_1080p", "price_per_unit": float(parts[1])})
    if len(parts) >= 3 and parts[2]:
        prices.append({"unit": "video_2160p", "price_per_unit": float(parts[2])})
        
    if len(parts) >= 4 and parts[3]:
        duration_range = parts[3].split('~')
        if len(duration_range) == 2:
            start = int(duration_range[0])
            end = int(duration_range[1])
            durations = list(range(start, end + 1))
            
    return prices, durations

def read_csv(filepath):
    data = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data.append(row)
    return data

def read_lines(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()[1:]
        return [line.strip() for line in lines if line.strip()]

def main():
    image_metadata = read_csv('final_filtered_image.csv')
    image_prices = read_lines('raw_price_image.txt')
    
    video_metadata = read_csv('raw_input_data_video.csv')
    video_prices = read_lines('raw_price_video.txt')
    
    output_rows = []
    
    for i in range(len(image_metadata)):
        meta = image_metadata[i]
        price_line = image_prices[i]
        prices = parse_image_price(price_line)
        
        output_rows.append({
            'endpoint_id': meta['endpoint_id'] if 'endpoint_id' in meta else meta.get('endpointId', ''),
            'provider': meta.get('provider', 'fal.ai'),
            'display_name': meta.get('display_name', meta.get('displayName', '')),
            'description': meta.get('description', ''),
            'category': meta.get('category', 'text-to-image' if 'text-to-image' in meta.get('endpoint_id', '') or 'text-to-image' in meta.get('endpointId', '') else 'image-to-image'),
            'status': meta.get('status', 'active'),
            'thumbnail_url': meta.get('thumbnail_url', ''),
            'model_url': meta.get('model_url', f"https://fal.run/{meta.get('endpoint_id', meta.get('endpointId', ''))}"),
            'supported_duration_range': json.dumps([]),
            'ai_model_price_list': json.dumps(prices)
        })
        
    for i in range(len(video_metadata)):
        meta = video_metadata[i]
        price_line = video_prices[i]
        prices, durations = parse_video_price(price_line)
        
        output_rows.append({
            'endpoint_id': meta['endpoint_id'] if 'endpoint_id' in meta else meta.get('endpointId', ''),
            'provider': meta.get('provider', 'fal.ai'),
            'display_name': meta.get('display_name', meta.get('displayName', '')),
            'description': meta.get('description', ''),
            'category': meta.get('category', 'image-to-video'),
            'status': meta.get('status', 'active'),
            'thumbnail_url': meta.get('thumbnail_url', ''),
            'model_url': meta.get('model_url', f"https://fal.run/{meta.get('endpoint_id', meta.get('endpointId', ''))}"),
            'supported_duration_range': json.dumps(durations),
            'ai_model_price_list': json.dumps(prices)
        })

    fieldnames = ['endpoint_id', 'provider', 'display_name', 'description', 'category', 'status', 'thumbnail_url', 'model_url', 'supported_duration_range', 'ai_model_price_list']
    
    with open('initial_ai_model_list.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in output_rows:
            writer.writerow(row)
            
if __name__ == '__main__':
    main()
