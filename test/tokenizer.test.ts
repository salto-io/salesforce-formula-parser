/*
*                      Copyright 2023 Salto Labs Ltd.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with
* the License.  You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
import { extractFormulaIdentifiers } from '../src/tokenizer'

describe('extractFormulaIdentifiers', () => {
  describe('when there are no identifiers', () => {
    it('should skip arithmetic expressions', () => {
      expect(extractFormulaIdentifiers('2 == (1.5 + 2) || (4 == 2) + 2')).toHaveLength(0)
    })
    it('should skip boolean literals', () => {
      expect(extractFormulaIdentifiers('TRUE || False || true && (false)')).toHaveLength(0)
    })
    it('should skip string literals', () => {
      expect(extractFormulaIdentifiers('\'a\' + \'b\'')).toHaveLength(0)
    })
    it('should skip string literals even if they have escaped quotes', () => {
      expect(extractFormulaIdentifiers('\'\\\'a\' + "\\"b"')).toHaveLength(0)
    })
    it('should skip function calls', () => {
      expect(extractFormulaIdentifiers('Function()')).toHaveLength(0)
    })
    it('should skip relational operators', () => {
      expect(extractFormulaIdentifiers('1 > 2 && 3 < 4 && 5<>6&&7!=8&&9==9')).toHaveLength(0)
    })
    it('should skip comments', () => {
      const formula = `
      /*identifier*/
      // identifier identifier
      /* identifier */
      
      /*
      identifier
      identifier
      identifier
      */
      
      `
      expect(extractFormulaIdentifiers(formula)).toHaveLength(0)
    })
  })
  describe('when there are identifiers', () => {
    it('should extract a simple identifier', () => {
      expect(extractFormulaIdentifiers('SomeField__c')).toEqual(['SomeField__c'])
      expect(extractFormulaIdentifiers(' SomeField__c ')).toEqual(['SomeField__c'])
    })
    it('should extract identifier when it`s a function parameter', () => {
      expect(extractFormulaIdentifiers('ISBLANK(SomeField__c)')).toEqual(['SomeField__c'])
      expect(extractFormulaIdentifiers('ISBLANK ( SomeField__c )')).toEqual(['SomeField__c'])
      expect(extractFormulaIdentifiers('ISBLANK(SomeField__c, SomeOtherField)')).toEqual(['SomeField__c', 'SomeOtherField'])
    })
    it('should extract identifier when it`s part of arithmetic expression', () => {
      expect(extractFormulaIdentifiers('"blah" & SomeField__c')).toEqual(['SomeField__c'])
      expect(extractFormulaIdentifiers('SomeField__c * 0.2')).toEqual(['SomeField__c'])
    })
    it('should extract identifier when its name contains a keyword', () => {
      expect(extractFormulaIdentifiers('trueField && TruE0')).toEqual(['trueField', 'TruE0'])
      expect(extractFormulaIdentifiers('maybeFalse__c')).toEqual(['maybeFalse__c'])
    })
  })
  describe('when there are identifiers with complex names', () => {
    it('should extract a simple identifier', () => {
      expect(extractFormulaIdentifiers('$SomeField__c')).toEqual(['$SomeField__c'])
      expect(extractFormulaIdentifiers('[SomeField__c]')).toEqual(['[SomeField__c]'])
      expect(extractFormulaIdentifiers('[SomeField__c].Field1.Field2')).toEqual(['[SomeField__c].Field1.Field2'])
      expect(extractFormulaIdentifiers('$SomeField__c.Field1.Field2')).toEqual(['$SomeField__c.Field1.Field2'])
    })
    it('should extract identifier when it`s a function parameter', () => {
      expect(extractFormulaIdentifiers('ISBLANK($SomeField__c.Field1)')).toEqual(['$SomeField__c.Field1'])
      expect(extractFormulaIdentifiers('ISBLANK([SomeField__c].Field1, $SomeOtherField.Field2.Field3)'))
        .toEqual(['[SomeField__c].Field1', '$SomeOtherField.Field2.Field3'])
    })
    it('should extract identifier when it`s part of arithmetic expression', () => {
      expect(extractFormulaIdentifiers('"blah" & $SomeField__c.Field1')).toEqual(['$SomeField__c.Field1'])
      expect(extractFormulaIdentifiers('[SomeField__c].Field2 * 0.2')).toEqual(['[SomeField__c].Field2'])
    })
  })
  describe('when there`s more than one identifier', () => {
    it('Should only extract unique identifiers', () => {
      expect(extractFormulaIdentifiers('IF(SomeField__c, SomeField__c, SomeField__c)')).toEqual(['SomeField__c'])
    })
    it('Should not reorder identifiers', () => {
      expect(extractFormulaIdentifiers('IF(zzz, zzz, bbb)')).toEqual(['zzz', 'bbb'])
      expect(extractFormulaIdentifiers('IF(zzz, bbb, zzz)')).toEqual(['zzz', 'bbb'])
    })
    it('Should not merge identifiers across whitespace', () => {
      expect(extractFormulaIdentifiers('identifier1 identifier2')).toEqual(['identifier1', 'identifier2'])
    })
    it('Should not extract identifiers from comments', () => {
      const formula = `
      IF( ISBLANK(SomeField__c),
      /*
      Some comment
      */
      
      /***
      Some comment
      here too ***/
      
      SomeOtherField,
      // One-line comment
      YetAnotherField)
      `
      expect(extractFormulaIdentifiers(formula)).toEqual(['SomeField__c', 'SomeOtherField', 'YetAnotherField'])
    })
    it('should extract identifiers from colon expressions', () => {
      // https://salesforce.stackexchange.com/questions/344851/what-does-a-colon-mean-in-a-formula-field
      const formula = `IF( ISBLANK( Owner:Queue.OwnerId )
      , Owner:User.FirstName & " " & Owner:User.LastName
      , Owner:Queue.QueueName)`
      expect(extractFormulaIdentifiers(formula)).toEqual(['Owner',
        'Queue.OwnerId', 'User.FirstName', 'User.LastName', 'Queue.QueueName'])
    })
  })
})
