def validate_event(event: dict, required_fields: list):
    """
    Validate that the event contains all required fields.
    
    Args:
        event (dict): The event to validate.
        required_fields (list): List of required field names.
    
    Raises:
        ValueError: If any required field is missing.
    """
    missing_fields = [field for field in required_fields if field not in event]
    if missing_fields:
        raise ValueError(f"Missing required fields in event: {', '.join(missing_fields)}")
    
def update_field_in_dynamodb(table, job: str, fields: dict):
    """
    Update specified fields in a DynamoDB job item.
    
    Args:
        job (str): The job ID.
        fields (dict): A dictionary of fields to update with their new values.

    Raises:
        Exception: If the update operation fails.
    """
    try:
        update_expressions = []
        expression_attribute_names = {}
        expression_attribute_values = {}
        
        for idx, (key, value) in enumerate(fields.items()):
            placeholder_name = f"#field{idx}"
            placeholder_value = f":value{idx}"
            update_expressions.append(f"{placeholder_name} = {placeholder_value}")
            expression_attribute_names[placeholder_name] = key
            expression_attribute_values[placeholder_value] = value
        
        update_expression = "SET " + ", ".join(update_expressions)
        
        table.update_item(
            Key={'job_id': job},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues='UPDATED_NEW'
        )

    except Exception as e:
        raise Exception(f"Failed to update job {job} in DynamoDB: {str(e)}")
    
def remove_field_in_dynamodb(table, job: str, field: str):
    """
    Remove a specified field from a DynamoDB job item.
    
    Args:
        job (str): The job ID.
        field (str): The field name to remove.

    Raises:
        Exception: If the remove operation fails.
    """

    try:
        response = table.get_item(Key={'job_id': job})
        
        if 'Item' not in response:
            raise Exception(f"Job {job} not found in DynamoDB")
        
        item = response['Item']
        if field not in item:
            return
        
        table.update_item(
            Key={'job_id': job},
            UpdateExpression=f"REMOVE #{field}",
            ExpressionAttributeNames={f"#{field}": field},
            ReturnValues='UPDATED_NEW'
        )
    except Exception as e:
        raise Exception(f"Failed to remove field {field} from job {job} in DynamoDB: {str(e)}")

